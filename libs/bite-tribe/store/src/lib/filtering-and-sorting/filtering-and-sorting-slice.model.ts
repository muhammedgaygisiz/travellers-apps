export type FilteringAndSortingSlice = {
  sorting?: {
    home?: string;
    mybites?: string;
    bucketlists?: string;
  };
  filtering?: {
    home?: {
      filters: string[];
      distance?: number;
      maxPrice?: number;
    };
    mybites?: {
      filters: string[];
      distance?: number;
      maxPrice?: number;
    };
  };
};
