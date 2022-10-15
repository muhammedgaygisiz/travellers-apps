describe('Login', () => {
  beforeEach(() =>
    cy.visit('/', {
      onBeforeLoad(win) {
        win.navigator.geolocation.getCurrentPosition = (cb) => {
          cb({
            coords: {
              latitude: 46.944091,
              longitude: 7.4293561,
            } as any,
          } as any);
        };
      },
    })
  );

  it('should login', () => {
    cy.gotoLogin();
    cy.login(Cypress.env('CYPRESS_USER_NAME'), Cypress.env('CYPRESS_PASSWORD'));

    cy.waitTillLocationCardIsVisible();
    cy.logout();
  });
});
