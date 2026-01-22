#!/usr/bin/env npx tsx
/**
 * Telegram Session Setup Script
 *
 * Interactive script to generate a Telegram session string for MTProto authentication.
 * This session string should be stored in TELEGRAM_SESSION_STRING environment variable.
 *
 * Usage:
 *   npx tsx scripts/telegram-session-setup.ts
 *
 * You will need:
 *   1. Telegram API ID and Hash from https://my.telegram.org/apps
 *   2. Your phone number (with country code)
 *   3. The verification code Telegram sends to your account
 *   4. Your 2FA password (if enabled)
 */

import * as readline from 'readline';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt for user input
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for password (hidden input)
 */
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    // Note: This doesn't actually hide input in all terminals
    // For production use, consider using a package like 'prompt-sync' or 'inquirer'
    process.stdout.write(question);
    let password = '';

    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', (char: string) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode?.(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine?.(0);
            process.stdout.cursorTo?.(0);
            process.stdout.write(question + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

/**
 * Main setup function
 */
async function setup(): Promise<void> {
  console.log('\n===========================================');
  console.log('   Telegram Session Setup');
  console.log('===========================================\n');

  console.log('This script will help you generate a session string for MTProto authentication.');
  console.log('You need to have a Telegram API ID and Hash from https://my.telegram.org/apps\n');

  // Get API credentials
  let apiId = process.env.TELEGRAM_API_ID;
  let apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId) {
    apiId = await prompt('Enter your Telegram API ID: ');
  } else {
    console.log(`Using API ID from environment: ${apiId}`);
  }

  if (!apiHash) {
    apiHash = await prompt('Enter your Telegram API Hash: ');
  } else {
    console.log(`Using API Hash from environment: ${apiHash.slice(0, 6)}...`);
  }

  if (!apiId || !apiHash) {
    console.error('\nError: API ID and Hash are required.');
    console.error('Get them from https://my.telegram.org/apps');
    process.exit(1);
  }

  // Get phone number
  const phoneNumber = await prompt('\nEnter your phone number (with country code, e.g. +1234567890): ');

  if (!phoneNumber.startsWith('+')) {
    console.error('\nError: Phone number must start with + and include country code.');
    process.exit(1);
  }

  console.log('\nInitializing Telegram client...');

  // Create empty session
  const session = new StringSession('');

  // Create client
  const client = new TelegramClient(session, parseInt(apiId, 10), apiHash, {
    connectionRetries: 5,
  });

  try {
    // Start authentication
    await client.start({
      phoneNumber: async () => phoneNumber,

      password: async () => {
        console.log('\n2FA is enabled on your account.');
        const password = await promptPassword('Enter your 2FA password: ');
        return password;
      },

      phoneCode: async () => {
        console.log('\nA verification code has been sent to your Telegram account.');
        const code = await prompt('Enter the verification code: ');
        return code;
      },

      onError: (err) => {
        console.error('\nAuthentication error:', err.message);
        throw err;
      },
    });

    console.log('\n===========================================');
    console.log('   Authentication Successful!');
    console.log('===========================================\n');

    // Get the session string
    const sessionString = session.save();

    console.log('Your session string (store this in TELEGRAM_SESSION_STRING env var):\n');
    console.log('─'.repeat(60));
    console.log(sessionString);
    console.log('─'.repeat(60));

    console.log('\nAdd this to your .env file:\n');
    console.log(`TELEGRAM_API_ID=${apiId}`);
    console.log(`TELEGRAM_API_HASH=${apiHash}`);
    console.log(`TELEGRAM_SESSION_STRING=${sessionString}`);

    console.log('\n\nIMPORTANT Security Notes:');
    console.log('─'.repeat(60));
    console.log('1. This session grants full access to your Telegram account');
    console.log('2. Store the session string securely (never commit to git!)');
    console.log('3. If compromised, revoke the session in Telegram settings');
    console.log('4. Consider using a dedicated Telegram account for OSINT');
    console.log('5. Session expires if unused for extended periods');

    // Test the connection
    console.log('\n\nTesting connection...');
    const me = await client.getMe();
    if (me && 'firstName' in me) {
      console.log(`Connected as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no username'})`);
    }

    // Disconnect
    await client.disconnect();
    console.log('\nSession setup complete! You can now use the Telegram adapter.');
  } catch (error) {
    console.error('\nSetup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  rl.close();
}

// Run the setup
setup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
