const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const workRoutes = require('./work');
const rankRoutes = require('./rank');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/work', workRoutes);
app.use('/api/rank', rankRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
