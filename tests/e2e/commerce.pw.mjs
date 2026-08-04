import { expect, gotoRoute, test } from "./support.mjs";

test.describe("购物袋与键盘流程", () => {
  test("开通会籍后可完成粤凳 01 与 02 的混合结账和订单快照", async ({
    page,
  }) => {
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

    await gotoRoute(
      page,
      "products/guangdong-stool-02?variant=stool-02-light-blue",
    );
    const addStool02ToBag = page.getByRole("button", {
      name: /加入购物袋/,
    });
    await expect(addStool02ToBag).toBeEnabled();
    await addStool02ToBag.click();
    await expect(page.getByText("作品已加入购物袋。")).toBeVisible();

    await gotoRoute(page, "bag");
    await expect(page.locator("main")).toContainText("粤凳 01");
    await expect(page.locator("main")).toContainText("瓷象牙");
    await expect(page.locator("main")).toContainText("粤凳 02");
    await expect(page.locator("main")).toContainText("浅蓝");

    const quantityControls = page.locator(".quantity-control");
    await expect(quantityControls).toHaveCount(2);
    const stool01Quantity = page.getByLabel("粤凳 01 · 瓷象牙数量", {
      exact: true,
    });
    const increaseStool01 = stool01Quantity.getByRole("button", {
      name: /增加.*数量/,
    });
    await increaseStool01.focus();
    await expect(increaseStool01).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(stool01Quantity).toContainText("2");

    const stool02Quantity = page.getByLabel("粤凳 02 · 浅蓝数量", {
      exact: true,
    });
    const increaseStool02 = stool02Quantity.getByRole("button", {
      name: /增加.*数量/,
    });
    await increaseStool02.click();
    await expect(stool02Quantity).toContainText("2");
    await increaseStool02.click();
    await expect(stool02Quantity).toContainText("3");
    await increaseStool02.click();
    await expect(stool02Quantity).toContainText("4");
    await expect(increaseStool02).toBeDisabled();

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
    await expect(
      page.getByRole("heading", {
        name: "粤凳 02 · 浅蓝",
        level: 3,
      }),
    ).toBeVisible();
    await expect(page.locator(".checkout-products")).toContainText(
      "2 × ¥18,800",
    );
    await expect(page.locator(".checkout-products")).toContainText(
      "4 × ¥18,800",
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
    await page.getByRole("button", { name: "确认礼宾配送" }).click();

    const paymentHeading = page.getByRole("heading", {
      name: "虚拟支付",
      level: 2,
    });
    await expect(paymentHeading).toBeVisible();
    await expect(paymentHeading).toBeFocused();
    const payButton = page.getByRole("button", {
      name: "虚拟支付 ¥112,800",
    });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/?]+\?success=1$/, {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "感谢你的选购", level: 1 }),
    ).toBeVisible();
    const orderRecord = page.locator(".order-record");
    await expect(orderRecord).toContainText("粤凳 01 · 瓷象牙");
    await expect(orderRecord).toContainText("粤凳 02 · 浅蓝");
    await expect(orderRecord).toContainText("2 × ¥18,800");
    await expect(orderRecord).toContainText("4 × ¥18,800");
    await expect(orderRecord).toContainText("¥112,800");
  });
});
