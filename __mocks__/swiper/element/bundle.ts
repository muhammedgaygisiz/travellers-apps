// Swiper registers real custom elements, which jsdom cannot upgrade. Tests
// assert the viewer's own contract (slides rendered, position, actions), so the
// registration is a no-op here and `swiper-container` stays an inert element.
export const register = (): void => undefined;
