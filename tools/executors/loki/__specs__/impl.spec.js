describe('loki executor', function () {
  describe('given the project.json for prices app', function () {
    it('should return expected command', function () {
      var expectedCommand =
        'loki ' +
        '--requireReferernce ' +
        '--reactUri ' +
        'file:/Users/muhammedgaygisiz/DEV/travellers-apps/dist/storybook/prices ' +
        '--reference=apps/prices/.loki/reference ' +
        '--difference=apps/prices/.loki/difference ' +
        '--output=apps/prices/.loki/current';
      var command = '';
      expect(command).toBe(expectedCommand);
    });
  });
});
