export const splitTags = (tags: string) => {
  return tags.split(/[\s,]+/).filter((tag) => tag.trim().length > 0);
};
