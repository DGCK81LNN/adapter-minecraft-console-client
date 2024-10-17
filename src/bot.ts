import {
  Adapter,
  Bot,
  Context,
  difference,
  Fragment,
  h,
  hyphenate,
  Schema,
  Time,
  uncapitalize,
  Universal,
} from "koishi"
import { MCCAdapter } from "./adapter"
import * as MCC from "./types"

export class MCCBot<
  C extends Context,
  T extends MCCBot.Config = MCCBot.Config
> extends Bot<C, T> {
  constructor(ctx: C, config: T) {
    super(ctx, config)
    this.internal = new MCC.Internal(this)
    this.platform = "minecraft"
    this.logger = ctx.logger("mcc")
    ctx.plugin(MCCAdapter, this)
  }

  async initialize() {
    await this.getLogin()
  }

  async sendMessage(channelId: string, content: Fragment): Promise<string[]> {
    const text = h("", h.normalize(content)).toString(true)
    if (!text.trim()) return []
    this.internal._send("/send " + text)
    return []
  }

  async sendPrivateMessage(userId: string, content: Fragment): Promise<string[]> {
    const text = h("", h.normalize(content)).toString(true)
    if (!text.trim()) return []
    this.internal.sendPrivateMessage(userId, text)
    return []
  }

  async getChannel(): Promise<Universal.Channel> {
    return {
      id: this.config.channelId,
      type: Universal.Channel.Type.TEXT,
      name: `${await this.internal.getServerHost()}:${await this.internal.getServerPort()}`,
    }
  }

  async getChannelList(): Promise<Universal.List<Universal.Channel>> {
    return {
      data: [await this.getChannel()],
    }
  }

  async getGuildList(): Promise<Universal.List<Universal.Guild>> {
    return {
      data: [await this.getChannel()],
    }
  }

  async getUser(userId: string): Promise<Universal.User> {
    return {
      id: userId,
      username: userId,
    }
  }

  async getGuildMember(guildId: string, userId: string): Promise<Universal.GuildMember> {
    return {
      user: await this.getUser(userId),
    }
  }

  async getGuildMemberList(
    guildId: string
  ): Promise<Universal.List<Universal.GuildMember>> {
    return {
      data: await Promise.all(
        (await this.internal.getOnlinePlayers()).map(u => this.getGuildMember(guildId, u))
      ),
    }
  }
}
export interface MCCBot<C extends Context, T extends MCCBot.Config = MCCBot.Config> {
  internal: MCC.Internal
}

export namespace MCCBot {
  export const usage = `请安装并运行 [Minecraft-Console-Client](https://mccteam.github.io)，并在其配置文件中启用 \`ChatBot.WebSocketBot\`。`

  export interface Config extends Adapter.WsClientConfig {
    endpoint: string
    mccPassword: string
    mccSessionId: string
    channelId: string
    responseTimeout: number
    eventTypes: string[]
  }
  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      endpoint: Schema.string()
        .role("url")
        .default("ws://127.0.0.1:8043/mcc")
        .description("要连接的 WebSocketBot 地址。"),
      mccPassword: Schema.string()
        .role("password")
        .default("wspass12345")
        .description("WebSocketBot 身份验证密码。"),
      mccSessionId: Schema.string()
        .default("koishi")
        .description("WebSocketBot 会话 ID。"),
      channelId: Schema.string().default("0").description("报告给 Koishi 的频道 ID。"),
      eventTypes: Schema.array(
        Schema.union([
          ...difference(MCC.eventNames, MCC.alwaysReceiveEvents).map(n =>
            hyphenate(uncapitalize(n.replace(/^On/, "")))
          ),
          Schema.const("_default").required().description("其他"),
        ])
      )
        .role("select")
        .description("要接收的 MCC 事件类型。"),
    }),
    Adapter.WsClientConfig,
    Schema.object({
      responseTimeout: Schema.natural()
        .role("time")
        .default(Time.minute)
        .description("等待响应的时间 (单位为毫秒)。"),
    }),
  ])
}
