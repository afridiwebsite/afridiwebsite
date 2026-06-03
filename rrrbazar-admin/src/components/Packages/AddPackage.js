import React, { useEffect, useRef, useState } from "react";
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

  // Bot type — replaces the legacy Auto-delivery + Is-shell checkboxes
  // with a single dropdown. Each value enables a different config slice
  // below:
  //   none      — no auto bot, admin fulfils manually
  //   uc-bot    — voucher-pool auto-delivery (was Auto-delivery)
  //   shell-bot — single shell value sent per tag (was Auto + Is-shell)
  //   like-bot  — Free Fire likes; URL built from key + server + uid
  //   pubg-bot  — placeholder, disabled until implemented
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
  // Like-bot config — admin supplies the endpoint URL (in `bot_url`) and
  // the API key (in `bot_config.key`). `uid` is appended from the
  // customer's Player ID at order time. `server_name` is no longer sent
  // from us — if the upstream needs it, the admin puts it directly in
  // the URL.
  const [likeBotKey, setLikeBotKey] = useState("");
  // PUBG-bot config — admin supplies an API key + picks a game and SKU.
  // The orders endpoint URL is hardcoded server-side; the SKU dropdown
  // is populated by proxying GamersPay's product catalogue through
  // /admin/pubg-bot/products. `player_id` is filled from the customer's
  // input at order time. No server field — game IDs already encode
  // region for FF, and PUBG's API doesn't require a server slug here.
  const [pubgKey, setPubgKey] = useState("");
  const [pubgGame, setPubgGame] = useState("pubg");
  const [pubgSku, setPubgSku] = useState("");
  const [pubgSkus, setPubgSkus] = useState([]); // [{ sku, price, display }]
  const [pubgSkusLoading, setPubgSkusLoading] = useState(false);
  const [pubgSkusError, setPubgSkusError] = useState(null);

  // Fetch the SKU catalogue whenever the admin types/changes the key or
  // picks a different game. Debounced 500ms so typing the key doesn't
  // hammer the upstream — the request only fires once they pause.
  useEffect(() => {
    if (botType !== "pubg-bot") return undefined;
    const game = String(pubgGame || "").trim();
    const key = String(pubgKey || "").trim();
    if (!game || !key) {
      setPubgSkus([]);
      setPubgSkusError(null);
      return undefined;
    }
    const handle = setTimeout(() => {
      setPubgSkusLoading(true);
      setPubgSkusError(null);
      axiosInstance
        .post(`/admin/pubg-bot/products`, { game, api_key: key })
        .then((res) => {
          const payload = res?.data?.data || res?.data || {};
          const items = Array.isArray(payload.items) ? payload.items : [];
          setPubgSkus(items);
          if (items.length === 0) {
            setPubgSkusError("No SKUs returned for this game.");
          }
        })
        .catch((err) => {
          setPubgSkus([]);
          setPubgSkusError(
            getErrors(err, false, true) || "Failed to load SKUs",
          );
        })
        .finally(() => setPubgSkusLoading(false));
    }, 500);
    return () => clearTimeout(handle);
  }, [botType, pubgGame, pubgKey]);
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

  // Rich-text package description — admin-facing HTML.
  const [descriptionHtml, setDescriptionHtml] = useState("");

  const addPackageHandler = (e) => {
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
      if (!String(pubgKey || "").trim()) {
        toast.error("PUBG-bot requires an API key", toastDefault);
        return;
      }
      if (!String(pubgGame || "").trim()) {
        toast.error("PUBG-bot requires a game selection", toastDefault);
        return;
      }
      if (!String(pubgSku || "").trim()) {
        toast.error("PUBG-bot requires a SKU", toastDefault);
        return;
      }
    }
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
            : botType === "pubg-bot"
              ? {
                  key: String(pubgKey || "").trim(),
                  game: String(pubgGame || "").trim(),
                  sku: String(pubgSku || "").trim(),
                }
              : {},
      })
      .then(async (res) => {
        // Persist voucher-map rows once we know the new package id. Maps
        // only matter for uc-bot (the voucher-pool dispatcher) — other
        // bot types ignore them, so we always push an empty list when
        // bot_type != uc-bot to clear stale entries.
        const newId = res?.data?.data?.id;
        if (newId) {
          try {
            await axiosInstance.post(
              `/admin/topup-package/${newId}/voucher-maps`,
              {
                voucher_package_ids:
                  botType === "uc-bot"
                    ? mappings.map((m) => m.voucher_package_id)
                    : [],
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
                        <option value="pubg-bot">
                          PUBG-bot (GamersPay UC/diamonds)
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

                      {botType === "pubg-bot" && (
                        <>
                          <div className="form_grid">
                            <div>
                              <label htmlFor="pubg_key">
                                PUBG-bot API key
                              </label>
                              <input
                                id="pubg_key"
                                type="text"
                                className="form_input"
                                value={pubgKey}
                                onChange={(e) => setPubgKey(e.target.value)}
                                placeholder="X-API-Key value"
                              />
                            </div>
                            <div>
                              <label htmlFor="pubg_game">Game</label>
                              <select
                                id="pubg_game"
                                className="form_input"
                                value={pubgGame}
                                onChange={(e) => {
                                  setPubgGame(e.target.value);
                                  setPubgSku("");
                                }}
                              >
                                <option value="pubg">pubg</option>
                                <option value="ff_mena">ff_mena</option>
                                <option value="ff_cis">ff_cis</option>
                                <option value="ff_sg">ff_sg</option>
                                <option value="ff_eu">ff_eu</option>
                                <option value="ff_bd">ff_bd</option>
                                <option value="ff_pk">ff_pk</option>
                                <option value="ff_latam">ff_latam</option>
                                <option value="ff_vn">ff_vn</option>
                                <option value="ff_tw">ff_tw</option>
                                <option value="ff_br">ff_br</option>
                                <option value="ff_id">ff_id</option>
                              </select>
                            </div>
                          </div>
                          <div className="form_grid">
                            {/* `sm:col-span-2` makes the SKU field span both
                                grid columns so the dropdown is wide enough
                                to read long item names like
                                "PUBG Mobile 660 UC — $10". */}
                            <div className="sm:col-span-2">
                              <label htmlFor="pubg_sku">SKU</label>
                              <select
                                id="pubg_sku"
                                className="form_input"
                                value={pubgSku}
                                onChange={(e) => setPubgSku(e.target.value)}
                                disabled={
                                  pubgSkusLoading || pubgSkus.length === 0
                                }
                              >
                                <option value="">
                                  {pubgSkusLoading
                                    ? "Loading SKUs…"
                                    : pubgSkus.length === 0
                                      ? "Enter API key to load SKUs"
                                      : "-- Select SKU --"}
                                </option>
                                {pubgSkus.map((item) => (
                                  <option key={item.sku} value={item.sku}>
                                    {item.display || item.sku}
                                    {item.price != null
                                      ? ` — $${item.price}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              {pubgSkusError && (
                                <p className="text-xs text-red-600 mt-1">
                                  {pubgSkusError}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Player ID comes from the customer's order. SKUs
                            are pulled from GamersPay using the API key
                            above — change the game to refresh the list.
                          </p>
                        </>
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
