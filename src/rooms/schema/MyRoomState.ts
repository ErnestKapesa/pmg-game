import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("string") username: string = "Anonymous";
  @type("string") color: string = "black";
  @type("number") x: number;
  @type("number") y: number;
  @type("number") score: number = 0;
  @type("boolean") active: boolean = true;
}

export class Item extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("string") type: "item" | "coin";
  @type("number") value: number;
}

export class Obstacle extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
}

export class ChatMessage extends Schema {
  @type("string") sender: string;
  @type("string") text: string;
  @type("number") timestamp: number;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Item }) items = new MapSchema<Item>();
  @type({ map: Obstacle }) obstacles = new MapSchema<Obstacle>();
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
  @type("number") remainingTime: number = 60; // Adjust to match server
  @type("number") level: number = 1;
}
