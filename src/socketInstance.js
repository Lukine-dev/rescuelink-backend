let io;

const setIO = (newIO) => {
  io = newIO;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { setIO, getIO };