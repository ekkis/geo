import { createServer } from 'remote-lib';

(async () => {
  await createServer({
    library: '.',
    port: 3000,
    name: 'Country List API',
    description: 'ISO codes, capitals, currencies, dialing codes'
  }).start();

  console.log('Country API service running on port 3000');
})();
