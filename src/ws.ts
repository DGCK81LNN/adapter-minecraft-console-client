import { Adapter, Context, Universal } from "koishi"
import { MCCBot } from "./bot"

export class WsClient<C extends Context> extends Adapter.WsClient<C, MCCBot<C>> {
  protected accept(socket: Universal.WebSocket) {
    socket.addEventListener("message", ({ data }) => {
      let parsed: any
      data = data.toString()
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        return this.bot.logger.warn('cannot parse message', data)
      }
      //this.bot.session().setInternal("mcc", parsed)
    })
  }
  protected prepare() {
    return this.ctx.http.ws(this.bot.config.endpoint)
  }
}
