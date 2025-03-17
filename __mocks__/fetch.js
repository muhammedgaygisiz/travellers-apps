global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => ({}),
  })
);
global.Response = jest.fn();
