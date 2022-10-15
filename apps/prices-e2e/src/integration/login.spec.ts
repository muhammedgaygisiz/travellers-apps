describe('Login', () => {
  beforeEach(() => cy.visit('/'));

  it('should login', () => {
    cy.gotoLogin();
    cy.login(Cypress.env('CYPRESS_USER_NAME'), Cypress.env('CYPRESS_PASSWORD'));

    cy.waitTillLocationCardIsVisible();
    cy.logout();
  });
});
