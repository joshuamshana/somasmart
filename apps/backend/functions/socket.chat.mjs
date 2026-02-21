export const chat = {
  name: '/chat',
  onEvent: (request, response) => {
    if (process.env.ENABLE_CHAT !== 'true') {
      response.emit({ body: { ok: false, code: 'CHAT_DISABLED' } });
      return;
    }

    response.announce({ body: { ok: true, echo: request.body ?? null } });
  }
};
