import { Room, Client } from "@colyseus/core";
import { MyRoomState, Player, Item, Obstacle, ChatMessage } from "./schema/MyRoomState";
import * as fs from "fs";
import * as path from "path";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;

  onCreate (options: any) {
    this.setState(new MyRoomState());
    this.state.level = 1;
    this.state.remainingTime = 60; // Set initial timer, adjust as needed

    // Generate collectibles and obstacles
    this.generateItems();
    this.generateObstacles();

    // Start timer
    this.clock.setInterval(() => {
      if (this.state.remainingTime > 0) {
        this.state.remainingTime--;
      } else {
        this.endLevel();
      }
    }, 1000);

    this.onMessage("chat", (client: Client, message: string) => {
      const chatMsg = new ChatMessage();
      const player = this.state.players.get(client.sessionId);
      if (player) {
        chatMsg.sender = player.username;
      } else {
        chatMsg.sender = "Anonymous";
      }
      chatMsg.text = message;
      chatMsg.timestamp = Date.now();
      this.state.chatMessages.push(chatMsg);
    });

    this.onMessage("move", (client: Client, { dx, dy }: { dx: number; dy: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.active) {
        const newX = Math.max(0, Math.min(19, player.x + dx));
        const newY = Math.max(0, Math.min(19, player.y + dy));

        // Check for obstacle collision
        let collided = false;
        this.state.obstacles.forEach((obstacle: Obstacle) => {
          if (obstacle.x === newX && obstacle.y === newY) {
            collided = true;
          }
        });
        if (collided) {
          player.active = false;
          this.broadcast("playerLost", { playerId: client.sessionId });
          // Check if all players are inactive
          const activePlayers = Array.from(this.state.players.values()).filter((p: Player) => p.active);
          if (activePlayers.length <= 1) {
            this.endGame();
          }
          return;
        }

        player.x = newX;
        player.y = newY;

        // Check for collection
        this.state.items.forEach((item, id) => {
          if (item.x === newX && item.y === newY) {
            player.score += item.value;
            this.state.items.delete(id);
            this.broadcast("collect", { playerId: client.sessionId, itemId: id });
          }
        });

        // Removed endGame on all items collected to allow timer-based levels

      }
    });

    }

  endLevel() {
    const activePlayers = Array.from(this.state.players.values()).filter(p => p.active);
    if (activePlayers.length <= 1) {
      this.endGame();
      return;
    }

    // Find min score
    const minScore = Math.min(...activePlayers.map(p => p.score));
    // Eliminate players with min score
    activePlayers.forEach(p => {
      if (p.score === minScore) {
        p.active = false;
        this.broadcast("playerEliminated", { playerId: p.id });
      }
    });

    // Advance to next level
    this.state.level++;
    this.broadcast("levelUp", { level: this.state.level });

    // Regenerate items (new coins)
    this.state.items.clear();
    this.generateItems();

    // Optionally regenerate obstacles if desired
    // this.state.obstacles.clear();
    // this.generateObstacles();

    // Reset player positions
    this.state.players.forEach((player: Player) => {
      if (player.active) {
        let x: number;
        let y: number;
        let occupied: boolean;
        do {
          x = Math.floor(Math.random() * 20);
          y = Math.floor(Math.random() * 20);
          occupied = Array.from(this.state.obstacles.values()).some((obs: Obstacle) => obs.x === x && obs.y === y) ||
                     Array.from(this.state.items.values()).some((it: Item) => it.x === x && it.y === y);
        } while (occupied);
        player.x = x;
        player.y = y;
      }
    });

    // Reset timer
    this.state.remainingTime = 60; // Adjust as needed
  }

  endGame() {
    this.saveHighScores();
    this.broadcast("gameOver", {});
    // Optionally disconnect players or clean up
  }

  generateItems() {
    const numItems = 10;
    const numCoins = 20;
    const positions = new Set<string>();

    for (let i = 0; i < numItems + numCoins; i++) {
      let x, y, key;
      do {
        x = Math.floor(Math.random() * 20);
        y = Math.floor(Math.random() * 20);
        key = `${x},${y}`;
      } while (positions.has(key));
      positions.add(key);

      const item = new Item();
      item.id = `item${i}`;
      item.x = x;
      item.y = y;
      item.type = i < numItems ? "item" : "coin";
      item.value = i < numItems ? 5 : 1;
      this.state.items.set(item.id, item);
    }
  }

  generateObstacles() {
    const numObstacles = 15;
    const positions = new Set<string>();
    this.state.items.forEach((item: Item) => positions.add(`${item.x},${item.y}`));

    for (let i = 0; i < numObstacles; i++) {
      let x, y, key;
      do {
        x = Math.floor(Math.random() * 20);
        y = Math.floor(Math.random() * 20);
        key = `${x},${y}`;
      } while (positions.has(key));
      positions.add(key);

      const obstacle = new Obstacle();
      obstacle.id = `obstacle${i}`;
      obstacle.x = x;
      obstacle.y = y;
      this.state.obstacles.set(obstacle.id, obstacle);
    }
  }

  saveHighScores() {
    const scoresPath = path.join(__dirname, "../../scores.json");
    const highScores = Array.from(this.state.players.values()).map((p: Player) => ({ username: p.username, score: p.score }));
    fs.writeFileSync(scoresPath, JSON.stringify(highScores, null, 2));
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
    player.id = client.sessionId;
    player.username = options.username || "Anonymous";
    player.color = options.color || "black";
    player.active = true; // Ensure active on join
    let x: number;
    let y: number;
    let occupied: boolean;
    do {
      x = Math.floor(Math.random() * 20);
      y = Math.floor(Math.random() * 20);
      occupied = Array.from(this.state.obstacles.values()).some((obs: Obstacle) => obs.x === x && obs.y === y) ||
                 Array.from(this.state.items.values()).some((it: Item) => it.x === x && it.y === y);
    } while (occupied);
    player.x = x;
    player.y = y;
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
