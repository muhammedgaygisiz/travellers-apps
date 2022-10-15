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
    cy.intercept('GET', 'https://api.geoapify.com*', {
      fixture: 'location.json',
    });

    cy.gotoLogin();
    cy.login(Cypress.env('username'), Cypress.env('password'));

    cy.waitTillLocationCardIsVisible();
    cy.logout();
  });
});
