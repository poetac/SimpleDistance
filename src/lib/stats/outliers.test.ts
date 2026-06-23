import { describe, it, expect } from "vitest";
import { iqrOutliers, robustZOutliers } from "./outliers";

describe("IQR outlier detection", () => {
  it("flags an obvious mishit", () => {
    const data = [170, 172, 168, 175, 169, 171, 173, 167, 90];
    const res = iqrOutliers(data);
    expect(res.outlierIndices).toContain(8); // the 90
    expect(res.mask[8]).toBe(true);
  });

  it("flags nothing on clean data", () => {
    const data = [170, 172, 168, 175, 169, 171];
    expect(iqrOutliers(data).outlierIndices).toHaveLength(0);
  });

  it("is a no-op with too few points", () => {
    expect(iqrOutliers([1, 2, 3]).outlierIndices).toHaveLength(0);
  });
});

describe("robust z (MAD) outlier detection", () => {
  it("flags an extreme value", () => {
    const data = [100, 101, 99, 100, 102, 98, 250];
    const res = robustZOutliers(data);
    expect(res.outlierIndices).toContain(6);
  });
});
