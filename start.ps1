# Start the server in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm i; node server.js"

# Navigate to client and start the development server
cd client
npm i
npm run dev 