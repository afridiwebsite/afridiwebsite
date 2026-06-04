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

  // Reward shape per package. 'coin' = legacy coin_value reward, 'money'
  // = BDT cashback (cashbackAmount) credited to user.wallet on completion.
  // The two modes are mutually exclusive in the UI; the server zeros out
  // whichever field doesn't match the picked mode to keep the DB clean.
  // resellerCashback is independent and pays out to reseller users in
  // addition to whatever reward the package is configured for.
  const [rewardType, setRewardType] = useState("coin");
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [resellerCashback, setResellerCashback] = useState(0);

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

  // Per-package dynamic inputs. Same shape as the product-level inputs but
  // gated on a checkbox — when on, these rows override the product inputs on
  // the storefront's order form. Same validation rules: at most one Player ID
  // input, every input needs a title, etc.
  const PLAYER_ID_TITLE = "Player ID";
  const isPlayerIdTitle = (t) =>
    String(t || "").trim().toLowerCase() === PLAYER_ID_TITLE.toLowerCase();
  const newInputRow = () => ({
    _key: Math.random().toString(36).slice(2),
    title: "",
    verify_type: "none",
    verify_url: "",
    verify_game: "",
    api_token: "",
    region_lock: "",
  });
  const GAMERSPAY_GAMES = [
    "pubg",
    "ff_mena",
    "ff_cis",
    "ff_sg",
    "ff_eu",
    "ff_bd",
    "ff_pk",
    "ff_latam",
    "ff_vn",
    "ff_tw",
    "ff_br",
    "ff_id",
  ];
  const REGION_OPTIONS = [
    { value: "", label: "— No region lock —" },
    { value: "IND", label: "IND — India" },
    { value: "BD", label: "BD — Bangladesh" },
    { value: "PK", label: "PK — Pakistan" },
    { value: "ID", label: "ID — Indonesia" },
    { value: "BR", label: "BR — Brazil" },
    { value: "SG", label: "SG — Singapore" },
    { value: "MY", label: "MY — Malaysia" },
    { value: "TH", label: "TH — Thailand" },
    { value: "VN", label: "VN — Vietnam" },
    { value: "PH", label: "PH — Philippines" },
    { value: "TW", label: "TW — Taiwan" },
    { value: "ME", label: "ME — Middle East" },
    { value: "EU", label: "EU — Europe" },
    { value: "NA", label: "NA — North America" },
    { value: "SA", label: "SA — South America" },
    { value: "CIS", label: "CIS — CIS" },
  ];
  const [hasCustomInputs, setHasCustomInputs] = useState(false);
  const [packageInputs, setPackageInputs] = useState([]);
  const updatePkgInputAt = (idx, patch) =>
    setPackageInputs((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const addPkgInputRow = () =>
    setPackageInputs((prev) => [...prev, newInputRow()]);
  const removePkgInputAt = (idx) =>
    setPackageInputs((prev) => prev.filter((_, i) => i !== idx));

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
    // Per-package input validation — only enforced when the override is on.
    if (hasCustomInputs) {
      const playerIdRows = packageInputs.filter((it) => isPlayerIdTitle(it.title));
      if (playerIdRows.length > 1) {
        toast.error(
          `Only one input can use the reserved title "${PLAYER_ID_TITLE}".`,
          toastDefault,
        );
        return;
      }
      if (packageInputs.some((it) => !String(it.title || "").trim())) {
        toast.error("Every dynamic input needs a title.", toastDefault);
        return;
      }
      const dynamicMissingTag = packageInputs.find(
        (it) =>
          it.verify_type === "dynamic" &&
          String(it.verify_url || "").trim() &&
          !String(it.verify_url).includes("{value}"),
      );
      if (dynamicMissingTag) {
        toast.error(
          `Verify URL for "${dynamicMissingTag.title}" must include the {value} tag.`,
          toastDefault,
        );
        return;
      }
      const dynamicEmptyUrl = packageInputs.find(
        (it) =>
          it.verify_type === "dynamic" && !String(it.verify_url || "").trim(),
      );
      if (dynamicEmptyUrl) {
        toast.error(
          `Verify URL is required for "${dynamicEmptyUrl.title}".`,
          toastDefault,
        );
        return;
      }
      const gamerspayMissing = packageInputs.find(
        (it) =>
          it.verify_type === "gamerspay" &&
          (!String(it.verify_game || "").trim() ||
            !String(it.api_token || "").trim()),
      );
      if (gamerspayMissing) {
        toast.error(
          `GamersPay verify on "${gamerspayMissing.title}" needs both a Game and an API key.`,
          toastDefault,
        );
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
        // Reward fields. The two sides of the picker are mutually
        // exclusive — zero out whichever the admin didn't pick so the
        // backend never sees stale data from a previous shape.
        reward_type: rewardType,
        coin_value:
          rewardType === "coin"
            ? Number(coin_value.current?.value || 0)
            : 0,
        cashback_amount:
          rewardType === "money" ? Number(cashbackAmount) || 0 : 0,
        reseller_cashback: Number(resellerCashback) || 0,
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
        has_custom_inputs: hasCustomInputs ? 1 : 0,
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

          // Persist per-package dynamic inputs. We push an empty list when
          // the override is off so any stale rows from a previous edit are
          // cleared server-side.
          try {
            await axiosInstance.post(
              `/admin/topup-package/${newId}/inputs`,
              {
                inputs: hasCustomInputs
                  ? packageInputs.map((it, idx) => ({
                      title: it.title,
                      verify_type: it.verify_type || "none",
                      verify_player_name:
                        it.verify_type && it.verify_type !== "none" ? 1 : 0,
                      verify_url: it.verify_url || "",
                      verify_game: it.verify_game || "",
                      api_token: it.api_token || "",
                      region_lock: it.region_lock || "",
                      serial: idx,
                    }))
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

                  {/* Reward picker — admin picks money vs coin and the
                      matching input renders. Reseller cashback is
                      independent and always renders below. */}
                  <div className="form_grid">
                    <div>
                      <label htmlFor="reward_type">Reward type</label>
                      <select
                        id="reward_type"
                        className="form_input"
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value)}
                      >
                        <option value="coin">Coin</option>
                        <option value="money">Money (Cashback)</option>
                      </select>
                    </div>
                    {rewardType === "coin" ? (
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
                    ) : (
                      <div>
                        <label htmlFor="cashback_amount">
                          Cashback per purchase (৳)
                        </label>
                        <input
                          id="cashback_amount"
                          className="form_input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashbackAmount}
                          onChange={(e) => setCashbackAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="reseller_cashback">
                        Reseller cashback (৳)
                      </label>
                      <input
                        id="reseller_cashback"
                        className="form_input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={resellerCashback}
                        onChange={(e) => setResellerCashback(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paid to users marked as Reseller, in addition to the
                        regular reward above. Credited on completion only.
                      </p>
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
                          { value: 3, label: "Order once per user" },
                          { value: 4, label: "Order once a day per user" },
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
                        Modes 1 & 2 are scoped by Player ID (no effect on
                        products without a Player ID input). Modes 3 & 4 are
                        scoped by user account and apply regardless of
                        whether the product asks for a Player ID.
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

                  {/* Custom inputs override --- Start --- */}
                  <div className="my-4 p-3 border border-indigo-100 bg-indigo-50 rounded">
                    <label className="inline-flex items-center cursor-pointer select-none font-semibold text-indigo-900">
                      <input
                        type="checkbox"
                        className="form-checkbox mr-2"
                        checked={hasCustomInputs}
                        onChange={(e) => setHasCustomInputs(e.target.checked)}
                      />
                      Override product inputs for this package
                    </label>
                    <p className="text-xs text-indigo-800 mt-1">
                      When on, the storefront shows the inputs defined below
                      (instead of the product-level inputs) once a customer
                      picks this package on the topup page.
                    </p>

                    {hasCustomInputs && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-semibold">Order form inputs</label>
                          <button
                            type="button"
                            onClick={addPkgInputRow}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                          >
                            + Add input
                          </button>
                        </div>
                        <div className="mb-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-2">
                          <strong>Reserved keyword:</strong> "{PLAYER_ID_TITLE}". Using
                          it as a title enables verification options below. Only
                          one input per package may use it.
                        </div>
                        {packageInputs.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            No inputs yet. Click "Add input" to define one.
                          </p>
                        )}
                        {packageInputs.map((row, idx) => {
                          const reserved = isPlayerIdTitle(row.title);
                          return (
                            <div
                              key={row._key}
                              className="border border-gray-200 rounded p-3 mb-2 bg-white"
                            >
                              <div className="form_grid items-end">
                                <div>
                                  <label className="text-xs text-gray-600 block mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    className="form_input"
                                    placeholder='e.g. "Player ID", "Server", "Username"'
                                    value={row.title}
                                    onChange={(e) =>
                                      updatePkgInputAt(idx, { title: e.target.value })
                                    }
                                  />
                                  {reserved && (
                                    <p className="text-[11px] text-amber-700 mt-1">
                                      Reserved title — verify options below apply.
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => removePkgInputAt(idx)}
                                    className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              {reserved && (
                                <div className="mt-2">
                                  <label className="text-xs text-gray-600 block mb-1">
                                    Player name check
                                  </label>
                                  <select
                                    className="form_input"
                                    value={row.verify_type || "none"}
                                    onChange={(e) =>
                                      updatePkgInputAt(idx, {
                                        verify_type: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="none">No name check</option>
                                    <option value="dynamic">
                                      Check player name dynamic
                                    </option>
                                    <option value="gamerspay">
                                      Gamers pay name check
                                    </option>
                                  </select>

                                  {row.verify_type === "dynamic" && (
                                    <div className="mt-2">
                                      <div className="mb-2 text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                        <strong className="text-blue-800">
                                          Required tag:
                                        </strong>{" "}
                                        the Verify URL <em>must</em> include{" "}
                                        <code className="bg-white px-1 rounded border border-blue-200 text-blue-700">
                                          &#123;value&#125;
                                        </code>{" "}
                                        where the entered ID should go.
                                      </div>
                                      <label className="text-xs text-gray-600 block mb-1">
                                        Verify URL
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="https://example.com/nickname?uid={value}"
                                        value={row.verify_url}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            verify_url: e.target.value,
                                          })
                                        }
                                      />
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        API Token{" "}
                                        <span className="text-gray-400">
                                          (sent as{" "}
                                          <code>Authorization: Bearer &lt;token&gt;</code>)
                                        </span>
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="Optional bearer token for upstream API"
                                        value={row.api_token}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            api_token: e.target.value,
                                          })
                                        }
                                      />
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        Region Lock
                                      </label>
                                      <select
                                        className="form_input"
                                        value={row.region_lock}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            region_lock: e.target.value,
                                          })
                                        }
                                      >
                                        {REGION_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {row.verify_type === "gamerspay" && (
                                    <div className="mt-2">
                                      <label className="text-xs text-gray-600 block mb-1">
                                        Game
                                      </label>
                                      <select
                                        className="form_input"
                                        value={row.verify_game || ""}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            verify_game: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="">— Select game —</option>
                                        {GAMERSPAY_GAMES.map((g) => (
                                          <option key={g} value={g}>
                                            {g}
                                          </option>
                                        ))}
                                      </select>
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        API key{" "}
                                        <span className="text-gray-400">
                                          (sent as <code>X-API-Key</code>)
                                        </span>
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="GamersPay X-API-Key value"
                                        value={row.api_token}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            api_token: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Custom inputs override --- End --- */}

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
