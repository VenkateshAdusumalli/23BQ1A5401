const notificationSocket = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query?.userId;

    if (userId) {
      socket.join(userId);
    }

    socket.on("join", (payload) => {
      if (payload?.userId) {
        socket.join(payload.userId);
      }
    });
  });
};

export default notificationSocket;
