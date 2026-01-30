const app = require('./index');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
