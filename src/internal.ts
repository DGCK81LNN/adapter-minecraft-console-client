import {Adapter} from "koishi"
import { MCCBot } from "./bot"
import { ChatBot, MccJsClient } from "./mcc"

export class Internal {
  constructor(public readonly bot: MCCBot) {}
}
