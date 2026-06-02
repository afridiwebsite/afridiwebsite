import React, { useEffect, useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useUpload from "../../hooks/useUpload";
import useGet from "../../hooks/useGet";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import TextEditor from "../TextEditor/TextEditor";
import Loader from "../Loader/Loader";

function EditPackage(props) {
  const history = useHistory();
  const packageId = props.match.params.id;

  const [paymentLogo, setPaymentLogo] = useState(null);
  const { path, uploading } = useUpload(paymentLogo);

  const [loading, setLoading] = useState(null);
  const [data, loadingData] = useGet(`admin/topup-package/${packageId}`);
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
  // per player ID. Hydrated from the saved package below.
  const [orderLimit, setOrderLimit] = useState(0);
  useEffect(() => {
    if (data?.order_once == null) return;
    const v = Number(data.order_once);
    setOrderLimit(v === 2 ? 2 : v === 1 ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  // Quantity-tracked stock — hydrated from the saved package.
  const [stockTracking, setStockTracking] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  useEffect(() => {
    if (!data) return;
    setStockTracking(Number(data.stock_tracking) === 1);
    setStockQuantity(Number(data.stock_quantity) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  // Tracks the selected product so the "Allow quantity" checkbox only
  // renders for voucher-type products. Hydrated from the package's
  // product_id once the package finishes loading.
  const [selectedProductId, setSelectedProductId] = useState("");
  useEffect(() => {
    if (data?.product_id) setSelectedProductId(String(data.product_id));
  }, [data?.id]);
  const selectedProduct =
    (products || []).find((p) => String(p.id) === String(selectedProductId)) ||
    null;
  const isVoucherProduct = selectedProduct?.is_voucher == 1;

  // Bot type — single dropdown replaces the legacy Auto-delivery +
  // Is-shell checkboxes. Per-type config sections render below based on
  // the selected value.
  const [botType, setBotType] = useState("none");
  const autoDeliveryOn = botType === "uc-bot" || botType === "shell-bot";
  const isShell = botType === "shell-bot";
  const [shellValue, setShellValue] = useState("");
  const [tags, setTags] = useState([]);
  const addTag = () => setTags((prev) => [...prev, ""]);
  const updateTag = (idx, value) =>
    setTags((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const removeTag = (idx) =>
    setTags((prev) => prev.filter((_, i) => i !== idx));
  // Like-bot config — admin supplies URL in `bot_url` and key in
  // `bot_config.key`. `server_name` is no longer sent; if the upstream
  // needs it, the admin puts it directly in the URL.
  const [likeBotKey, setLikeBotKey] = useState("");

  useEffect(() => {
    if (!data) return;
    // Resolve bot_type with legacy fallback so packages saved before
    // this field existed still hydrate correctly.
    const explicit = String(data.bot_type || "")
      .toLowerCase()
      .trim();
    const allowed = ["uc-bot", "shell-bot", "like-bot", "pubg-bot", "none"];
    let next = allowed.includes(explicit) ? explicit : "none";
    if (next === "none") {
      if (Number(data.auto_delivery) === 1 && Number(data.is_shell) === 1)
        next = "shell-bot";
      else if (Number(data.auto_delivery) === 1) next = "uc-bot";
    }
    setBotType(next);

    setShellValue(String(data.shell || ""));
    let parsed = [];
    try {
      const raw = data.tags;
      if (Array.isArray(raw)) parsed = raw;
      else if (typeof raw === "string" && raw.trim().length > 0)
        parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
    setTags(
      Array.isArray(parsed)
        ? parsed.map((v) => String(v == null ? "" : v))
        : [],
    );

    // Hydrate like-bot config (key + server_name) from the JSON column.
    let cfg = {};
    try {
      const raw = data.bot_config;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) cfg = raw;
      else if (typeof raw === "string" && raw.trim()) cfg = JSON.parse(raw);
    } catch {
      cfg = {};
    }
    setLikeBotKey(String(cfg.key || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);
  const [mappings, setMappings] = useState([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [voucherProducts] = useGet(`admin/voucher-products-with-packages`);
  const [existingMaps, mapsLoading] = useGet(
    `admin/topup-package/${packageId}/voucher-maps`,
  );
  const [pickedProductId, setPickedProductId] = useState("");
  const [pickedPackageId, setPickedPackageId] = useState("");

  useEffect(() => {
    if (Array.isArray(existingMaps)) {
      setMappings(
        existingMaps.map((m) => ({
          voucher_package_id: m.voucher_package_id,
          voucher_package_name: m.voucher_package_name,
          voucher_product_name: m.voucher_product_name,
        })),
      );
    }
  }, [existingMaps]);

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
    // Duplicates are allowed: each row counts as another voucher to emit on
    // order, so an admin who wants two of the same voucher just adds the
    // mapping twice.
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

  const [descriptionHtml, setDescriptionHtml] = useState("");
  useEffect(() => {
    if (data?.description != null) setDescriptionHtml(data.description || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const editPackageHandler = (e) => {
    e.preventDefault();
    if (botType === "shell-bot") {
      const cleanShell = String(shellValue || "").trim();
      const cleanTags = tags
        .map((t) => String(t || "").trim())
        .filter((t) => t.length > 0);
      if (!cleanShell) {
        toast.error("Shell value is required for Shell-bot", toastDefault);
        return;
      }
      if (cleanTags.length === 0) {
        toast.error("At least one tag is required for Shell-bot", toastDefault);
        return;
      }
    }
    if (botType === "like-bot") {
      if (!String(bot_url.current?.value || "").trim()) {
        toast.error("Like-bot requires a base URL", toastDefault);
        return;
      }
      if (!String(likeBotKey || "").trim()) {
        toast.error("Like-bot requires an API key", toastDefault);
        return;
      }
    }
    if (botType === "pubg-bot") {
      toast.error("PUBG-bot is not yet supported", toastDefault);
      return;
    }
    setLoading(true);
    axiosInstance
      .post(`/admin/topup-package/update/${packageId}`, {
        product_id: product_id.current.value,
        name: name.current.value,
        price: sell_price.current.value,
        bprice: buy_price.current.value,
        serial: serial.current.value,
        logo: path || data?.logo,
        coin_value: coin_value.current.value || 0,
        in_stock: in_stock.current.checked ? 1 : 0,
        order_once: orderLimit,
        allow_quantity:
          isVoucherProduct && allow_quantity.current?.checked ? 1 : 0,
        bot_url: bot_url.current?.value || "",
        description: descriptionHtml,
        // Legacy flags — server derives these from bot_type too, but
        // keep sending them for backward compat.
        auto_delivery: autoDeliveryOn ? 1 : 0,
        stock_tracking: stockTracking ? 1 : 0,
        stock_quantity: stockTracking
          ? Math.max(0, Number(stockQuantity) || 0)
          : 0,
        is_shell: isShell ? 1 : 0,
        shell: isShell ? String(shellValue || "").trim() : "",
        tags: isShell
          ? tags.map((v) => String(v || "").trim()).filter((v) => v.length > 0)
          : [],
        bot_type: botType,
        bot_config:
          botType === "like-bot"
            ? { key: String(likeBotKey || "").trim() }
            : {},
      })
      .then(async () => {
        // Replace voucher-map rows. Only uc-bot uses voucher mappings;
        // every other bot type gets an empty list to clear stale rows.
        try {
          await axiosInstance.post(
            `/admin/topup-package/${packageId}/voucher-maps`,
            {
              voucher_package_ids:
                botType === "uc-bot"
                  ? mappings.map((m) => m.voucher_package_id)
                  : [],
            },
          );
        } catch (e) {
          /* package update already saved; ignore */
        }
        toast.success("Topup package updated successfully", toastDefault);

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
          <h3 className="text-lg font-bold text-black">
            Edit topup package -- {data?.name}
          </h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
            {loadingData || loading || loadingProducts ? (
              <Loader absolute />
            ) : (
              ""
            )}
            {hasData(data) && hasData(products) && (
              <form onSubmit={editPackageHandler}>
                <div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="name">Product</label>
                      <select
                        defaultValue={data?.product_id}
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
                        defaultValue={data?.name}
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
                        step="any"
                        id="sell_price"
                        defaultValue={data?.price}
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
                        defaultValue={data?.bprice}
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
                        defaultValue={data?.serial}
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
                        defaultValue={data?.coin_value || 0}
                        id="coin_value"
                        className="form_input"
                        type="number"
                        min="0"
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
                          defaultChecked={data?.in_stock == 1 ? true : false}
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
                          { value: 1, label: "Order once per player" },
                          { value: 2, label: "Order once a day per player" },
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

                  {/* Allow quantity — voucher-products only. */}
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
                            defaultChecked={data?.allow_quantity == 1}
                            key={`aq-${data?.id}-${data?.allow_quantity}`}
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

                  {/* Bot type — single dropdown replaces the legacy
                      Auto-delivery + Is-shell checkboxes. Per-type config
                      sections render below based on the selected value. */}
                  <div className="form_grid mt-5">
                    <div>
                      <label
                        htmlFor="bot_type"
                        className="block font-semibold mb-1"
                      >
                        Bot type
                      </label>
                      <select
                        id="bot_type"
                        className="form_input"
                        value={botType}
                        onChange={(e) => setBotType(e.target.value)}
                      >
                        <option value="none">None — manual fulfilment</option>
                        <option value="uc-bot">
                          UC-bot (voucher pool auto-delivery)
                        </option>
                        <option value="shell-bot">
                          Shell-bot (per-tag shell dispatch)
                        </option>
                        <option value="like-bot">
                          Like-bot (Free Fire likes)
                        </option>
                        <option value="pubg-bot" disabled>
                          PUBG-bot — coming soon
                        </option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Pick how the order should be dispatched on placement.
                        More types will be added over time.
                      </p>

                      {(botType === "uc-bot" ||
                        botType === "shell-bot" ||
                        botType === "like-bot") && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="bot_url">
                              {botType === "like-bot"
                                ? "Like-bot URL"
                                : "Auto-bot URL"}
                            </label>
                            <input
                              ref={bot_url}
                              id="bot_url"
                              type="url"
                              defaultValue={data?.bot_url || ""}
                              key={`bu-${data?.id}-${botType}`}
                              className="form_input"
                              placeholder={
                                botType === "like-bot"
                                  ? "https://api.fflike.shop/api/like"
                                  : "https://bot.example.com/dispatch"
                              }
                            />
                          </div>
                        </div>
                      )}

                      {botType === "shell-bot" && (
                        <div className="form_grid">
                          <div>
                            <p className="text-xs text-gray-500 mt-1">
                              Shell value is sent in the bot's <code>code</code>{" "}
                              field. The bot is fired once per tag, with the tag
                              value in <code>pacakge</code>/<code>package</code>
                              .
                            </p>
                          </div>
                          <div>
                            <label htmlFor="shell_value">Shell value</label>
                            <input
                              id="shell_value"
                              type="text"
                              className="form_input"
                              value={shellValue}
                              onChange={(e) => setShellValue(e.target.value)}
                              placeholder="e.g. SHELL-CODE-001"
                            />
                          </div>
                        </div>
                      )}

                      {botType === "like-bot" && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="like_bot_key">
                              Like-bot API key
                            </label>
                            <input
                              id="like_bot_key"
                              type="text"
                              className="form_input"
                              value={likeBotKey}
                              onChange={(e) => setLikeBotKey(e.target.value)}
                              placeholder="e.g. AMS-3A9BA3250A6A3"
                            />
                          </div>
                        </div>
                      )}

                      {autoDeliveryOn && isShell && (
                        <div className="mt-3 border border-gray-200 rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">
                              Tags ({tags.length})
                              <span className="text-xs font-normal text-red-600 ml-1">
                                * at least one required
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={addTag}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                            >
                              + Add tag
                            </button>
                          </div>
                          {tags.length === 0 && (
                            <p className="text-xs text-gray-500 italic">
                              No tags yet. Click "Add tag" to add one.
                            </p>
                          )}
                          {tags.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                              {tags.map((v, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5"
                                >
                                  <span className="text-xs text-gray-500 w-6 text-right">
                                    #{i + 1}
                                  </span>
                                  <input
                                    type="text"
                                    className="form_input !mb-0 flex-1"
                                    value={v}
                                    onChange={(e) =>
                                      updateTag(i, e.target.value)
                                    }
                                    placeholder="e.g. 60UC"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeTag(i)}
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

                      {/* Mapped voucher packages — shell-only auto-delivery
                          doesn't draw from voucher pools, so the mapping UI is
                          hidden when "Is shell" is on to keep the form tidy. */}
                      {autoDeliveryOn && !isShell && (
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
                          {mapsLoading && (
                            <p className="text-xs text-gray-500 italic">
                              Loading…
                            </p>
                          )}
                          {!mapsLoading && mappings.length === 0 && (
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
                      Edit package
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

export default withRouter(EditPackage);
