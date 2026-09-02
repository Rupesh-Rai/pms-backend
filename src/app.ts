import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Server is healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;