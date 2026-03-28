/**
 * منطق حرج لمرحلة: دفع أولي + بنود تكميلية + رحلة أكفيك (بدون DB).
 * يعكس سلوك getWorkshopInvoicePaid ودفع المتبقي.
 */

function isWorkshopStepFullyPaid(inv) {
  if (!inv) return false;
  const paid = Number(inv.paidAmount) || 0;
  const total = Number(inv.totalAmount) || 0;
  const eps = 0.005;
  if (total > 0 && paid >= total - eps) return true;
  return inv.status === 'PAID';
}

function remainingDue(inv) {
  const totalDue = Number(inv.totalAmount) || 0;
  const paidSoFar = Number(inv.paidAmount) || 0;
  return Math.round((totalDue - paidSoFar) * 100) / 100;
}

describe('workshop inspection supplement — journey invoice gate', () => {
  test('PARTIALLY_PAID with balance due is not “workshop paid” for journey', () => {
    expect(
      isWorkshopStepFullyPaid({
        status: 'PARTIALLY_PAID',
        paidAmount: 100,
        totalAmount: 175,
      })
    ).toBe(false);
  });

  test('PAID status counts as paid', () => {
    expect(
      isWorkshopStepFullyPaid({
        status: 'PAID',
        paidAmount: 100,
        totalAmount: 100,
      })
    ).toBe(true);
  });

  test('paidAmount >= totalAmount counts as paid even if status lags', () => {
    expect(
      isWorkshopStepFullyPaid({
        status: 'PARTIALLY_PAID',
        paidAmount: 200,
        totalAmount: 200,
      })
    ).toBe(true);
  });
});

describe('remaining invoice amount (customer pay)', () => {
  test('computes remainder after first payment', () => {
    expect(remainingDue({ totalAmount: 250, paidAmount: 250 })).toBe(0);
    expect(remainingDue({ totalAmount: 250, paidAmount: 100 })).toBe(150);
  });
});
