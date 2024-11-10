import type {} from "@koishijs/plugin-proxy-agent"
import {
  Adapter,
  Context,
  Dict,
  h,
  hyphenate,
  Random,
  uncapitalize,
  Universal,
} from "koishi"
import { MCCBot } from "./bot"
import * as MCC from "./types"

export class MCCAdapter<C extends Context> extends Adapter.WsClient<C, MCCBot<C>> {
  // public logger: Logger

  // constructor(ctx: C, bot: MCCBot<C>) {
  //   super(ctx, bot)
  //   this.ctx.on("http/websocket-init", console.log)
  // }

  protected prepare() {
    return this.ctx.http.ws(this.bot.config.endpoint, { proxyAgent: "" })
  }

  #listeners: Dict<(response: MCC.Events["OnWsCommandResponse"]) => void> =
    Object.create(null)

  protected async accept(socket: Universal.WebSocket) {
    socket.addEventListener("message", ({ data }) => {
      let payload: MCC.Payload
      data = data.toString()
      try {
        const parsed = JSON.parse(data)
        payload = {
          event: parsed.event,
          data: parsed.data ? JSON.parse(parsed.data) : undefined,
        }
      } catch (err) {
        return this.bot.logger.warn("cannot parse message", data)
      }
      const hyphenatedEventName = hyphenate(
        uncapitalize(payload.event.replace(/^On/, ""))
      )
      if (
        !([...MCC.alwaysReceiveEvents] as string[]).includes(payload.event) &&
        !this.bot.config.eventTypes.includes(
          MCC.eventNames.includes(payload.event) ? hyphenatedEventName : "_default"
        )
      )
        return
      this.bot.logger.debug("event", payload.event, payload.data)

      const is = <T extends keyof MCC.Events>(
        payload: MCC.Payload,
        event: T
      ): payload is MCC.Payload<T> => payload.event === event

      if (
        is(payload, "OnWsCommandResponse") &&
        payload.data?.requestId &&
        payload.data.requestId in this.#listeners
      ) {
        this.#listeners[payload.data.requestId](payload.data)
        delete this.#listeners[payload.data.requestId]
        return
      }

      const session = this.bot.session()
      session.type = `mcc/${hyphenatedEventName}`
      session.isDirect = false
      session.channelId = this.bot.config.channelId
      session.setInternal("mcc", payload)

      if (is(payload, "OnChatPublic")) {
        session.type = "message"
        session.userId = payload.data.username
        session.elements = [h.text(payload.data.message)]
      } else if (is(payload, "OnChatPrivate")) {
        session.type = "message"
        session.isDirect = true
        session.userId = payload.data.sender
        session.channelId = `private:${payload.data.sender}`
        session.elements = [h.text(payload.data.message)]
      } else if (is(payload, "OnTeleportRequest")) {
        session.userId = payload.data.sender
      } else if (is(payload, "OnGamemodeUpdate") || is(payload, "OnLatencyUpdate")) {
        session.userId = payload.data.playerName
      } else if (is(payload, "OnPlayerJoin")) {
        session.type = "guild-member-added"
        session.userId = payload.data.name
      } else if (is(payload, "OnPlayerLeave")) {
        session.type = "guild-member-removed"
        session.userId = payload.data.name
      }

      if (session.userId) session.event.user.name = session.userId
      this.bot.logger.debug(session)
      this.bot.dispatch(session)
    })

    this.bot.internal._send = data => {
      this.bot.logger.debug("send raw", data)
      socket.send(data)
    }
    this.bot.internal._wsCommand = (command, ...parameters) => {
      const requestId = Random.id(20, 36)
      return new Promise((resolve, reject) => {
        this.#listeners[requestId] = resolve
        this.bot.logger.debug("wsCommand", { command, requestId, parameters })
        socket.send(JSON.stringify({ command, requestId, parameters }))
        setTimeout(() => {
          delete this.#listeners[requestId]
          reject(new MCC.TimeoutError(command, parameters))
        }, this.bot.config.responseTimeout)
      })
    }

    socket.addEventListener("close", () => {
      this.bot.internal._send = null
      this.bot.internal._wsCommand = null
    })

    if (this.bot.config.mccPassword)
      await this.bot.internal.authenticate(this.bot.config.mccPassword)
    if (this.bot.config.mccSessionId)
      await this.bot.internal
        .changeSessionId(this.bot.config.mccSessionId)
        .catch(e => this.bot.logger.warn(e))

    const username = await this.bot.internal.getUsername()
    this.bot.user.name = this.bot.user.id = username
    this.bot.user.avatar = `https://littleskin.cn/avatar/player/${username}?size=500&3d=`
    this.bot.online()
  }
}
