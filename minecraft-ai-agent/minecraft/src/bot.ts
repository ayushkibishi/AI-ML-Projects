import mineflayer from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';
import { plugin as collectBlock } from 'mineflayer-collectblock';
// @ts-ignore
import { plugin as pvp } from 'mineflayer-pvp';
import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import * as path from 'path';

import * as utils from './utils';
import { executeDynamicSkill } from './skills';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const HOST    = process.env.MINECRAFT_HOST    || '127.0.0.1';
const PORT    = parseInt(process.env.MINECRAFT_PORT || '25565');
const USERNAME = process.env.BOT_USERNAME     || 'MinecraftAIAgent';
const VERSION  = process.env.MINECRAFT_VERSION || '1.20.1';
const AUTH     = process.env.MINECRAFT_AUTH === 'microsoft' ? 'microsoft' : 'offline';
const BACKEND_WS_URL = `ws://${process.env.BACKEND_HOST || '127.0.0.1'}:${process.env.BACKEND_PORT || '8000'}/ws/bot`;

let ws: WebSocket;
let bot: mineflayer.Bot;
let telemetryInterval: NodeJS.Timeout;
let currentGoal: string | null = null;
let currentTask: string | null = null;
let autonomousMode = false;  // Autonomous self-play flag
let isExecuting = false;     // Prevent concurrent skill execution

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket connection to backend
// ─────────────────────────────────────────────────────────────────────────────

function connectToBackend() {
  console.log(`Connecting to backend at ${BACKEND_WS_URL}...`);
  ws = new WebSocket(BACKEND_WS_URL);

  ws.on('open', () => {
    console.log('Connected to backend coordination channel.');
    if (bot && bot.entity) startTelemetry();
  });

  ws.on('message', async (data: string) => {
    try {
      const message = JSON.parse(data);

      // ── Autonomous mode toggle ──────────────────────────────────────────
      if (message.type === 'set_autonomous_mode') {
        autonomousMode = message.active;
        const state = autonomousMode ? 'ENABLED' : 'DISABLED';
        console.log(`[AUTO] Autonomous mode ${state}`);
        utils.logToConsole(bot, ws, `Autonomous mode ${state}`, 'INFO');
        if (autonomousMode) {
          bot?.chat?.('Autonomous mode activated — I will now play by myself!');
        } else {
          bot?.chat?.('Autonomous mode deactivated — waiting for commands.');
        }
        return;
      }

      // ── Execute code ────────────────────────────────────────────────────
      if (message.type === 'execute_code') {
        if (isExecuting) {
          utils.logToConsole(bot, ws, 'Already executing a skill — queued command ignored.', 'WARNING');
          return;
        }

        const { command, code, steps = [], explanation = '' } = message;
        currentGoal = command;
        currentTask = steps[0] || 'Executing...';

        utils.logToConsole(bot, ws, `Goal: "${command}"`);
        utils.logToConsole(bot, ws, `Plan: ${explanation}`);

        isExecuting = true;
        let success = false;
        try {
          success = await executeDynamicSkill(bot, ws, code, command);
          if (success) {
            utils.logToConsole(bot, ws, `Goal completed: "${command}"`);
            ws.send(JSON.stringify({
              type: 'skill_success',
              data: { name: command, code, description: `Goal: ${command}. Steps: ${steps.join(' → ')}` }
            }));
          } else {
            utils.logToConsole(bot, ws, `Goal failed: "${command}"`, 'WARNING');
            ws.send(JSON.stringify({
              type: 'skill_failure',
              data: { name: command, error: 'Skill returned false.' }
            }));
          }
        } catch (error: any) {
          utils.logToConsole(bot, ws, `Error in "${command}": ${error.message}`, 'ERROR');
          ws.send(JSON.stringify({
            type: 'skill_failure',
            data: { name: command, error: error.message || String(error) }
          }));
          success = false;
        } finally {
          isExecuting = false;
          currentGoal = null;
          currentTask = null;
        }

        // ── Autonomous loop: report task_complete so backend sends next goal ──
        if (autonomousMode && ws.readyState === WebSocket.OPEN) {
          const inventory = bot?.entity ? utils.getInventory(bot) : {};
          const pos = bot?.entity ? utils.getPosition(bot) : { x: 0, y: 64, z: 0 };
          ws.send(JSON.stringify({
            type: 'task_complete',
            data: {
              success,
              inventory,
              health: bot?.health ?? 20,
              hunger: bot?.food ?? 20,
              position: pos,
            }
          }));
          utils.logToConsole(bot, ws, '[AUTO] Reported task_complete — awaiting next goal...');
        }
      }
    } catch (err: any) {
      console.error('Error processing WS message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Backend WS closed. Reconnecting in 5s...');
    stopTelemetry();
    setTimeout(connectToBackend, 5000);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry
// ─────────────────────────────────────────────────────────────────────────────

function startTelemetry() {
  stopTelemetry();
  telemetryInterval = setInterval(() => {
    if (!bot || !bot.entity || ws.readyState !== WebSocket.OPEN) return;
    const pos = utils.getPosition(bot);
    ws.send(JSON.stringify({
      type: 'telemetry',
      data: {
        health: bot.health,
        hunger: bot.food,
        x: pos.x, y: pos.y, z: pos.z,
        inventory: utils.getInventory(bot),
        current_goal: currentGoal,
        current_task: currentTask,
      }
    }));
  }, 1000);
}

function stopTelemetry() {
  if (telemetryInterval) clearInterval(telemetryInterval);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bot creation
// ─────────────────────────────────────────────────────────────────────────────

function createBot() {
  console.log(`Connecting bot to ${HOST}:${PORT} as ${USERNAME} (${VERSION})...`);

  bot = mineflayer.createBot({ host: HOST, port: PORT, username: USERNAME, version: VERSION, auth: AUTH });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(pvp);

  bot.once('spawn', () => {
    console.log('Bot spawned in world!');
    const defaultMovements = new Movements(bot);
    bot.pathfinder.setMovements(defaultMovements);
    if (ws && ws.readyState === WebSocket.OPEN) startTelemetry();
  });

  bot.on('death', () => {
    utils.logToConsole(bot, ws, 'Bot died — respawning...', 'WARNING');
    currentGoal = null;
    currentTask = null;
    isExecuting = false;
    // On death in autonomous mode, report task_complete with success=false so backend re-plans
    if (autonomousMode && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'task_complete',
        data: { success: false, inventory: {}, health: 20, hunger: 20, position: { x: 0, y: 64, z: 0 } }
      }));
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    utils.logToConsole(bot, ws, `Chat [${username}]: "${message}"`);
  });

  bot.on('kicked', (reason) => {
    console.warn(`Bot kicked: ${reason}`);
    stopTelemetry();
    isExecuting = false;
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err);
    isExecuting = false;
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Retrying in 10s...');
    stopTelemetry();
    isExecuting = false;
    setTimeout(createBot, 10000);
  });
}

// Start
connectToBackend();
createBot();
