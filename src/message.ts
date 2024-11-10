import { Context, Element, MessageEncoder } from "koishi"
import { MCCBot } from "./bot"

export class MCCMessageEncoder<C extends Context = Context> extends MessageEncoder<
  C,
  MCCBot<C>
> {
  buffer = ""

  async flush() {
    if (!this.buffer.trim()) return
    if (this.session.channelId.startsWith("private:")) {
      const userId = this.session.channelId.slice(8)
      await this.bot.internal.sendPrivateMessage(userId, this.buffer)
    } else {
      this.bot.internal._send("/send " + this.buffer)
    }
    this.buffer = ""
  }

  async visit(element: Element) {
    // since Minecraft chat is normally plain text only, only the most basic processing is done
    const { type, attrs, children } = element
    if (type === "text") {
      this.buffer += attrs.content
    } else if (type === "at") {
      this.buffer += `@${attrs.type || attrs.id}`
    } else if (type === "sharp") {
      this.buffer += `#${attrs.id}`
    } else if (type === "br") {
      // You can't actually send newlines in Minecraft chat; they are automatically replaced with spaces by MCC.
      // We could split messages on linebreaks but it looks too verbose, so screw it we're leaving them as is.
      this.buffer += "\n"
    } else if (type === "p") {
      if (!this.buffer.endsWith("\n")) this.buffer += "\n"
      await this.render(children)
      if (!this.buffer.endsWith("\n")) this.buffer += "\n"
    } else if (type === "message") {
      await this.flush()
      await this.render(children)
      await this.flush()
    } else {
      await this.render(children)
    }
  }
}
