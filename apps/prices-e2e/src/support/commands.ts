// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  // eslint-disable-next-line no-unused-vars
  interface Chainable {
    // eslint-disable-next-line no-unused-vars
    login(email: string, password: string): void;
    gotoLogin(): void;
    waitTillLocationCardIsVisible(): void;
    logout(): void;
  }
}

Cypress.Commands.add('login', (email, password) => {
  if (typeof password !== 'string' || !password) {
    throw new Error('Missing password value, set using CYPRESS_PASSWORD=...');
  }

  cy.get('[data-cy=email]').type(email);
  cy.get('[data-cy=password]').type(password, { log: false });

  cy.get('[data-cy=submit]').click();
});

Cypress.Commands.add('gotoLogin', () => {
  cy.get('[data-cy=btn-login]').click();
});

Cypress.Commands.add('waitTillLocationCardIsVisible', () => {
  cy.get('[data-cy=location-card]', { timeout: 20_000 }).should('be.visible');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=btn-logout]').click();
});
