import { Bot } from 'mineflayer';
import * as utils from './utils';
import { SKILL_LIBRARY_CODE } from './skills_library';

/**
 * Dynamically compiles and executes a JavaScript code string.
 * Automatically prepends the built-in skill library so generated code
 * can call helpers like collectWood(), craftItem(), mineBlocks(), etc.
 */
export async function executeDynamicSkill(
  bot: Bot,
  socket: any,
  code: string,
  skillName: string
): Promise<boolean> {
  utils.logToConsole(bot, socket, `Initializing skill: '${skillName}'`);

  try {
    // Prepend the built-in skill library to all generated code
    const fullCode = `
${SKILL_LIBRARY_CODE}

${code}

if (typeof execute !== 'function') {
  throw new Error("No execute() function defined in generated skill code.");
}
return execute(bot);
`;

    const compiledFunction = new Function('bot', 'utils', 'require', fullCode);
    const result = await compiledFunction(bot, utils, require);

    utils.logToConsole(bot, socket, `Skill '${skillName}' completed. Result: ${result}`);
    return result !== false;
  } catch (error: any) {
    const errorDetails = error.stack || error.message || String(error);
    utils.logToConsole(bot, socket, `Skill '${skillName}' failed: ${errorDetails}`, 'ERROR');
    throw error;
  }
}
