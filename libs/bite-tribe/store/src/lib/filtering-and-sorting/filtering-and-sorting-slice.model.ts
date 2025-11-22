export type FilteringAndSortingSlice = {
  sorting?: {
    home?: string;
    myBites?: string;
    bucketlists?: string;
  };
  filtering?: {
    home?: {
      filters: string[];
      distance?: number;
      maxPrice?: number;
    };
  };
};
