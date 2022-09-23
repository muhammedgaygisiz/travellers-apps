describe('loki nx executor', () => {
  describe('given the project.json file of the prices app', () => {
    it('should execute the command with right parameters', () => {
      const expected =
        'loki ' +
        '--requireReferernce ' +
        '--reactUri file:/Users/muhammedgaygisiz/DEV/travellers-apps/dist/storybook/prices ' +
        '--reference=../../apps/prices/.loki/reference ' +
        '--difference=../../apps/prices/.loki/difference ' +
        '--output=../../apps/prices/.loki/current';

      const result = '';
      expect(result).toBe(expected);
    });
  });
});
