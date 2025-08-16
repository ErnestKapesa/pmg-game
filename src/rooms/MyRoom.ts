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

    // Start timer with error handling to prevent crashes
    this.clock.setInterval(() => {
      try {
        if (this.state.remainingTime > 0) {
          this.state.remainingTime--;
        } else {
          this.endLevel();
        }
      } catch (error) {
        console.error('Timer error in room', this.roomId, ':', error);
        // Attempt to recover by resetting timer if needed
        if (this.state.remainingTime <= 0) {
          this.state.remainingTime = 60;
        }
      }
    }, 1000);

    this.onMessage("chat", (client: Client, message: string) => {
      try {
        // Validate chat message
        if (typeof message !== 'string' || message.trim().length === 0) {
          console.warn('Invalid chat message from client', client.sessionId);
          return;
        }

        // Limit message length to prevent spam
        const sanitizedMessage = message.trim().substring(0, 200);
        
        const chatMsg = new ChatMessage();
        const player = this.state.players.get(client.sessionId);
        if (player) {
          chatMsg.sender = player.username || "Anonymous";
        } else {
          chatMsg.sender = "Anonymous";
        }
        chatMsg.text = sanitizedMessage;
        chatMsg.timestamp = Date.now();
        
        // Limit chat history to prevent memory issues
        this.state.chatMessages.push(chatMsg);
        if (this.state.chatMessages.length > 50) {
          this.state.chatMessages.splice(0, this.state.chatMessages.length - 50);
        }
      } catch (error) {
        console.error('Error handling chat message from client', client.sessionId, ':', error);
      }
    });

    this.onMessage("move", (client: Client, { dx, dy }: { dx: number; dy: number }) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.active) {
          return; // Player not found or inactive
        }

        // Validate movement input
        if (typeof dx !== 'number' || typeof dy !== 'number') {
          console.warn('Invalid movement data from client', client.sessionId);
          return;
        }

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

        // Check for collection with error handling
        const itemsToRemove: string[] = [];
        this.state.items.forEach((item, id) => {
          if (item.x === newX && item.y === newY) {
            player.score += item.value || 1; // Fallback value
            itemsToRemove.push(id);
            this.broadcast("collect", { playerId: client.sessionId, itemId: id });
          }
        });
        
        // Remove collected items
        itemsToRemove.forEach(id => {
          this.state.items.delete(id);
        });

        // Removed endGame on all items collected to allow timer-based levels
      } catch (error) {
        console.error('Error handling move message from client', client.sessionId, ':', error);
      }
    });

    }

  endLevel() {
    try {
      const activePlayers = Array.from(this.state.players.values()).filter(p => p.active);
      if (activePlayers.length <= 1) {
        this.endGame();
        return;
      }

      // Find min score with safety check
      if (activePlayers.length === 0) {
        console.warn('No active players found during endLevel');
        return;
      }

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

      // Reset player positions with error handling
      this.state.players.forEach((player: Player) => {
        if (player.active) {
          let x: number;
          let y: number;
          let occupied: boolean;
          let attempts = 0;
          const maxAttempts = 100; // Prevent infinite loops
          
          do {
            x = Math.floor(Math.random() * 20);
            y = Math.floor(Math.random() * 20);
            occupied = Array.from(this.state.obstacles.values()).some((obs: Obstacle) => obs.x === x && obs.y === y) ||
                       Array.from(this.state.items.values()).some((it: Item) => it.x === x && it.y === y);
            attempts++;
          } while (occupied && attempts < maxAttempts);
          
          if (attempts >= maxAttempts) {
            console.warn('Could not find free position for player', player.id, 'using fallback');
            x = Math.floor(Math.random() * 20);
            y = Math.floor(Math.random() * 20);
          }
          
          player.x = x;
          player.y = y;
        }
      });

      // Reset timer
      this.state.remainingTime = 60; // Adjust as needed
    } catch (error) {
      console.error('Error in endLevel:', error);
      // Fallback: just reset timer and continue
      this.state.remainingTime = 60;
    }
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
    console.log(client.sessionId, "attempting to join!");
    
    // Prevent duplicate players from same session
    if (this.state.players.has(client.sessionId)) {
      console.warn(`Duplicate join attempt from session ${client.sessionId}, ignoring`);
      return;
    }
    
    // Check for duplicate username and modify if needed
    let username = options.username || "Anonymous";
    const existingPlayer = Array.from(this.state.players.values())
      .find(p => p.username === username);
    if (existingPlayer) {
      username = `${username}_${Date.now().toString().slice(-4)}`;
      console.log(`Username conflict resolved: ${options.username} -> ${username}`);
    }
    
    const player = new Player();
    player.id = client.sessionId;
    player.username = username;
    player.color = options.color || "black";
    player.active = true; // Ensure active on join
    player.score = 0; // Initialize score
    
    // Find safe spawn position
    let x: number;
    let y: number;
    let occupied: boolean;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      x = Math.floor(Math.random() * 20);
      y = Math.floor(Math.random() * 20);
      occupied = Array.from(this.state.obstacles.values()).some((obs: Obstacle) => obs.x === x && obs.y === y) ||
                 Array.from(this.state.items.values()).some((it: Item) => it.x === x && it.y === y) ||
                 Array.from(this.state.players.values()).some((p: Player) => p.x === x && p.y === y);
      attempts++;
    } while (occupied && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      console.warn(`Could not find safe spawn position for ${client.sessionId}, using fallback`);
      x = Math.floor(Math.random() * 20);
      y = Math.floor(Math.random() * 20);
    }
    
    player.x = x;
    player.y = y;
    this.state.players.set(client.sessionId, player);
    console.log(`Player ${client.sessionId} (${username}) joined successfully at (${x}, ${y})`);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
