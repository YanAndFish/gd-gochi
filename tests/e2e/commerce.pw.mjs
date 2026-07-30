import { expect, gotoRoute, test } from "./support.mjs";

test.describe("购物袋与键盘流程", () => {
  test("开通会籍后可用键盘完成购物袋与结账确认", async ({ page }) => {
    await gotoRoute(page, "membership/checkout");
    const membershipPayment = page.getByRole("button", {
      name: /^虚拟支付/,
    });
    await expect(membershipPayment).toBeEnabled();
    await membershipPayment.click();
    await expect(page).toHaveURL(/\/membership$/, { timeout: 10_000 });
    await expect(page.locator("main")).toContainText("辑选会员");

    await gotoRoute(
      page,
      "products/guangdong-stool-01?variant=stool-ivory",
    );
    const addToBag = page.getByRole("button", {
      name: /加入购物袋/,
    });
    await expect(addToBag).toBeEnabled();
    await addToBag.focus();
    await expect(addToBag).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("作品已加入购物袋。")).toBeVisible();

    await gotoRoute(page, "bag");
    await expect(page.locator("main")).toContainText("粤凳 01");
    await expect(page.locator("main")).toContainText("瓷象牙");

    const quantityControl = page.locator(".quantity-control");
    await expect(quantityControl).toHaveCount(1);
    const increaseButton = quantityControl.getByRole("button", {
      name: /增加.*数量/,
    });
    await increaseButton.focus();
    await expect(increaseButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(quantityControl).toContainText("2");
    const checkoutLink = page.getByRole("link", {
      name: "进入礼宾结账",
    });
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.focus();
    await expect(checkoutLink).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(
      page.getByRole("heading", { name: "礼宾结账", level: 1 }),
    ).toBeVisible();
    const checkoutProgress = page.getByRole("list", {
      name: "结账进度",
    });
    await expect(
      checkoutProgress.locator('[aria-current="step"]'),
    ).toContainText("订单确认");
    await expect(
      page.getByRole("heading", { name: "确认作品", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "粤凳 01 · 瓷象牙",
        level: 3,
      }),
    ).toBeVisible();
    await expect(page.locator(".checkout-products")).toContainText(
      "2 × ¥18,800",
    );

    const confirmOrder = page.getByRole("button", {
      name: "确认订单",
    });
    await confirmOrder.focus();
    await expect(confirmOrder).toBeFocused();
    await page.keyboard.press("Enter");

    const deliveryHeading = page.getByRole("heading", {
      name: "礼宾配送",
      level: 2,
    });
    await expect(deliveryHeading).toBeVisible();
    await expect(deliveryHeading).toBeFocused();
    await expect(
      checkoutProgress.locator('[aria-current="step"]'),
    ).toContainText("礼宾配送");
    await expect(
      page.getByRole("button", { name: "确认礼宾配送" }),
    ).toBeVisible();
  });
});
