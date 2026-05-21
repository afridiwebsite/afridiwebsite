import React, { useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useUpload from "../../hooks/useUpload";
import useGet from "../../hooks/useGet";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import TextEditor from "../TextEditor/TextEditor";
import Loader from "../Loader/Loader";

function AddPackage(props) {
  const history = useHistory();
  const productId = props.match.params.id;

  const [paymentLogo, setPaymentLogo] = useState(null);
  const { path, uploading } = useUpload(paymentLogo);

  const [loading, setLoading] = useState(null);
  const [products, loadingProducts] = useGet(`admin/topup-products`);

  const product_id = useRef(null);
  const name = useRef(null);
  const sell_price = useRef(null);
  const buy_price = useRef(null);
  const in_stock = useRef(null);
  const serial = useRef(null);
  const logo = useRef(null);
  const coin_value = useRef(null);
  const bot_url = useRef(null);
  const auto_delivery = useRef(null);
  const allow_quantity = useRef(null);

  // Re-order limit: 0 = none, 1 = once forever per player ID, 2 = once/day
  // per player ID. Server enforces by playerid; this is also relayed back
  // through myOrderedOncePackages so the storefront grays the card out.
  const [orderLimit, setOrderLimit] = useState(0);

  // Quantity-tracked stock. When `stockTracking` is on, each order decrements
  // `stockQuantity` server-side and the storefront treats the package as
  // out-of-stock once it hits 0.
  const [stockTracking, setStockTracking] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);

  const [selectedProductId, setSelectedProductId] = useState(productId || "");
  const selectedProduct =
    (products || []).find((p) => String(p.id) === String(selectedProductId)) ||
    null;
  const isVoucherProduct = selectedProduct?.is_voucher == 1;

  const [autoDeliveryOn, setAutoDeliveryOn] = useState(false);
  // Shell mode — only relevant while auto-delivery is on. When `isShell`
  // flips off, we also clear `shellValue` so a stale string can't leak to
  // the bot on the next dispatch.
  const [isShell, setIsShell] = useState(false);
  const [shellValue, setShellValue] = useState("");
  const [mappings, setMappings] = useState([]); // [{ voucher_package_id, voucher_package_name, voucher_product_name }]
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [voucherProducts] = useGet(`admin/voucher-products-with-packages`);
  const [pickedProductId, setPickedProductId] = useState("");
  const [pickedPackageId, setPickedPackageId] = useState("");

  const pickedProduct =
    (voucherProducts || []).find(
      (p) => String(p.id) === String(pickedProductId),
    ) || null;
  const availablePackages = pickedProduct?.packages || [];

  const openMapModal = () => {
    setPickedProductId("");
    setPickedPackageId("");
    setIsMapModalOpen(true);
  };
  const closeMapModal = () => setIsMapModalOpen(false);
  const addMapping = () => {
    if (!pickedProductId || !pickedPackageId) {
      toast.error("Select a product and a package", toastDefault);
      return;
    }
    const pid = Number(pickedPackageId);
    if (mappings.some((m) => m.voucher_package_id === pid)) {
      toast.error("That package is already mapped", toastDefault);
      return;
    }
    const pack = availablePackages.find((p) => p.id === pid);
    setMappings((prev) => [
      ...prev,
      {
        voucher_package_id: pid,
        voucher_package_name: pack?.name || `Package #${pid}`,
        voucher_product_name: pickedProduct?.name || "—",
      },
    ]);
    setIsMapModalOpen(false);
  };
  const removeMapping = (idx) =>
    setMappings((prev) => prev.filter((_, i) => i !== idx));

  // Rich-text package description — admin-facing HTML.
  const [descriptionHtml, setDescriptionHtml] = useState("");

  const addPackageHandler = (e) => {
    e.preventDefault();
    setLoading(true);
    axiosInstance
      .post(`/admin/topup-package/add`, {
        product_id: product_id.current.value,
        name: name.current.value,
        price: sell_price.current.value,
        bprice: buy_price.current.value,
        serial: serial.current.value,
        logo: path,
        coin_value: coin_value.current.value || 0,
        in_stock: in_stock.current.checked ? 1 : 0,
        order_once: orderLimit,
        allow_quantity:
          isVoucherProduct && allow_quantity.current?.checked ? 1 : 0,
        bot_url: bot_url.current?.value || "",
        description: descriptionHtml,
        auto_delivery: autoDeliveryOn ? 1 : 0,
        stock_tracking: stockTracking ? 1 : 0,
        stock_quantity: stockTracking ? Math.max(0, Number(stockQuantity) || 0) : 0,
        is_shell: autoDeliveryOn && isShell ? 1 : 0,
        shell: autoDeliveryOn && isShell ? String(shellValue || "").trim() : "",
      })
      .then(async (res) => {
        // Persist voucher-map rows once we know the new package id.
        // The endpoint replaces the full set on every call.
        const newId = res?.data?.data?.id;
        if (newId && autoDeliveryOn) {
          try {
            await axiosInstance.post(
              `/admin/topup-package/${newId}/voucher-maps`,
              {
                voucher_package_ids: mappings.map((m) => m.voucher_package_id),
              },
            );
          } catch (e) {
            /* package is already saved; ignore */
          }
        }
        toast.success("Topup package created successfully", toastDefault);

        setTimeout(() => {
          history.push("/topup-packages");
        }, 1500);
      })
      .catch((err) => {
        toast.error(getErrors(err, false, true), toastDefault);
        setLoading(false);
      });
  };

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-black">Add package</h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
            {loading || loadingProducts ? <Loader absolute /> : ""}
            {hasData(products) && (
              <form onSubmit={addPackageHandler}>
                <div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="name">Product</label>
                      <select
                        defaultValue={productId}
                        ref={product_id}
                        className="form_input"
                        onChange={(e) => setSelectedProductId(e.target.value)}
                      >
                        {products?.map((product) => (
                          <option value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="name">Name</label>
                      <input
                        ref={name}
                        id="name"
                        className="form_input"
                        type="text"
                        placeholder="Name"
                        required
                      />
                    </div>
                  </div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="sell_price">Sell price</label>
                      <input
                        ref={sell_price}
                        id="sell_price"
                        className="form_input"
                        type="number"
                        placeholder="Sell price"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="buy_price">Buy price</label>
                      <input
                        ref={buy_price}
                        id="buy_price"
                        className="form_input"
                        type="number"
                        placeholder="Buy price"
                        required
                      />
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="serial">Serial</label>
                      <input
                        ref={serial}
                        id="serial"
                        className="form_input"
                        type="number"
                        placeholder="Package Serial"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="logo">Logo</label>
                      <input
                        ref={logo}
                        id="logo"
                        className="form_input"
                        type="file"
                        onChange={(e) => setPaymentLogo(e.target.files[0])}
                      />
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="coin_value">
                        Coin reward per purchase
                      </label>
                      <input
                        ref={coin_value}
                        id="coin_value"
                        className="form_input"
                        type="number"
                        min="0"
                        defaultValue={0}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label class="inline-flex items-center mt-6">
                        <input
                          ref={in_stock}
                          id="in_stock"
                          value="1"
                          className="form-checkbox"
                          type="checkbox"
                        />
                        <span class="ml-2">In Stock</span>
                      </label>
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={stockTracking}
                          onChange={(e) => setStockTracking(e.target.checked)}
                        />
                        <span className="ml-2">Track stock quantity</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        When on, each order deducts from the count and the
                        storefront shows the package as out of stock once it
                        hits 0.
                      </p>
                    </div>
                    {stockTracking && (
                      <div>
                        <label htmlFor="stock_quantity">Stock quantity</label>
                        <input
                          id="stock_quantity"
                          className="form_input"
                          type="number"
                          min="0"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form_grid">
                    <div>
                      <span className="block font-semibold mb-1">
                        Re-order limit
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 0, label: "None" },
                          { value: 1, label: "Order once per user" },
                          { value: 2, label: "Order once a day per user" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className="inline-flex items-center cursor-pointer select-none"
                          >
                            <input
                              type="radio"
                              name="order_once"
                              className="mr-2"
                              checked={orderLimit === opt.value}
                              onChange={() => setOrderLimit(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Scoped by Player ID. No effect on products that don't
                        have a Player ID input.
                      </p>
                    </div>
                  </div>

                  {/* Allow quantity — voucher-products only. Gates the
                      quantity stepper on /topup/:id so admins can sell
                      single-unit voucher packages alongside bulk ones. */}
                  {isVoucherProduct && (
                    <div className="form_grid">
                      <div>
                        <label className="inline-flex items-center cursor-pointer select-none">
                          <input
                            ref={allow_quantity}
                            id="allow_quantity"
                            value="1"
                            className="form-checkbox"
                            type="checkbox"
                          />
                          <span className="ml-2">
                            Allow quantity input on storefront
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          When on, customers can buy multiple units in one
                          order.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Auto-delivery — maps voucher packages to this package. */}
                  <div className="form_grid mt-5">
                    <div>
                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          ref={auto_delivery}
                          id="auto_delivery"
                          type="checkbox"
                          className="form-checkbox"
                          checked={autoDeliveryOn}
                          onChange={(e) => setAutoDeliveryOn(e.target.checked)}
                        />
                        <span className="ml-2">Auto-delivery</span>
                      </label>

                      {autoDeliveryOn && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="bot_url">Auto-bot URL</label>
                            <input
                              ref={bot_url}
                              id="bot_url"
                              type="url"
                              className="form_input"
                              placeholder="https://bot.example.com/dispatch"
                            />
                          </div>
                        </div>
                      )}

                      {autoDeliveryOn && (
                        <div className="form_grid">
                          <div>
                            <label className="inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={isShell}
                                onChange={(e) =>
                                  setIsShell(e.target.checked)
                                }
                              />
                              <span className="ml-2">Is shell</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              When on, the value below is sent to the bot's{" "}
                              <code>code</code> field instead of the emitted
                              voucher.
                            </p>
                          </div>
                          {isShell && (
                            <div>
                              <label htmlFor="shell_value">Shell value</label>
                              <input
                                id="shell_value"
                                type="text"
                                className="form_input"
                                value={shellValue}
                                onChange={(e) =>
                                  setShellValue(e.target.value)
                                }
                                placeholder="e.g. SHELL-CODE-001"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {autoDeliveryOn && (
                        <div className="mt-3 border border-gray-200 rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">
                              Mapped voucher packages ({mappings.length})
                            </span>
                            <button
                              type="button"
                              onClick={openMapModal}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                            >
                              + Add new
                            </button>
                          </div>
                          {mappings.length === 0 && (
                            <p className="text-xs text-gray-500 italic">
                              No voucher packages mapped yet. Click "Add new" to
                              pick one.
                            </p>
                          )}
                          {mappings.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                              {mappings.map((m, i) => (
                                <li
                                  key={`${m.voucher_package_id}-${i}`}
                                  className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-1.5 text-sm"
                                >
                                  <span>
                                    <strong>{m.voucher_product_name}</strong>
                                    <span className="text-gray-400 mx-1">
                                      ›
                                    </span>
                                    {m.voucher_package_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeMapping(i)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-4">
                    <label className="block mb-2 font-semibold">
                      Description{" "}
                      <span className="text-xs font-normal text-gray-500">
                        (shown as a tooltip when users hover the package card —
                        inline images supported)
                      </span>
                    </label>
                    <TextEditor
                      value={descriptionHtml}
                      onHtmlChange={setDescriptionHtml}
                      minHeight={220}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="cstm_btn w-full block"
                    >
                      Add package
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {isMapModalOpen && (
        <div
          className="fixed inset-0 z-[9999999] bg-black/50 flex items-center justify-center p-4"
          onClick={closeMapModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-base font-bold text-black">
                Map voucher package
              </h4>
              <button
                type="button"
                onClick={closeMapModal}
                className="text-gray-500 hover:text-gray-800 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Voucher product
                </label>
                <select
                  className="form_input !mb-0 !py-1.5"
                  value={pickedProductId}
                  onChange={(e) => {
                    setPickedProductId(e.target.value);
                    setPickedPackageId("");
                  }}
                >
                  <option value="">-- Select product --</option>
                  {(voucherProducts || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {voucherProducts === null && (
                  <p className="text-xs text-gray-500 mt-1">Loading…</p>
                )}
                {Array.isArray(voucherProducts) &&
                  voucherProducts.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      No voucher-type products yet. Mark a product as
                      <em> "Is voucher product"</em> first.
                    </p>
                  )}
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Package
                </label>
                <select
                  className="form_input !mb-0 !py-1.5"
                  value={pickedPackageId}
                  onChange={(e) => setPickedPackageId(e.target.value)}
                  disabled={!pickedProductId}
                >
                  <option value="">-- Select package --</option>
                  {availablePackages.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.name}
                    </option>
                  ))}
                </select>
                {pickedProductId && availablePackages.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    This product has no packages.
                  </p>
                )}
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMapModal}
                className="cstm_btn_small !bg-gray-200 !text-gray-700 hover:!bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMapping}
                disabled={!pickedProductId || !pickedPackageId}
                className="cstm_btn_small disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default withRouter(AddPackage);
