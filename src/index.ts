import { Session } from "koishi"
import { MCCBot } from "./bot"
import { Internal } from "./internal"

export * from "./bot"
export * from "./ws"
export default MCCBot

declare module "@satorijs/core" {
  interface Session {
    mcc?: Internal
  }
}

declare module "koishi" {
  interface Events {
    'mcc/'(session: Session): void
  }
}
