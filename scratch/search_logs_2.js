import fs from 'fs';
import readline from 'readline';

const logPath = 'C:/Users/radhamay_ratanA/.gemini/antigravity/brain/be642826-180c-4cca-9db0-743927609742/.system_generated/logs/transcript.jsonl';

async function search() {
  if (!fs.existsSync(logPath)) {
    console.log('Log file does not exist at:', logPath);
    return;
  }
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching logs...');
  let count = 0;
  for await (const line of rl) {
    if (line.toLowerCase().includes('password') && !line.includes('Google@123456@')) {
      console.log(`Match at line ${count}:`, line.substring(0, 1000));
    }
    count++;
  }
}

search();
