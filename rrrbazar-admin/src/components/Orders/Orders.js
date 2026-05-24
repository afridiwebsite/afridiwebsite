import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import { ordersTableColumns } from "../../utils/reactTableColumns";
import Table from "../react-table/Table";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import SearchOrder from "./SearchOrder";
import ViewOrderModal from "./ViewOrderModal";

// Escape user-supplied template strings so they're safe to inline as HTML
// attribute values inside the Swal markup (datalist option, etc.).
const escAttr = (s) =>
    String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

function Orders() {
    const [totalDataCount, setTotalDataCount] = useState(null)
    const [savedComments, setSavedComments] = useState([])
    // Bulk-retry selection mode: when on, each retryable row shows a
    // leading checkbox and a floating action bar surfaces the count + a
    // "Retry selected" button. Only orders that have at least one
    // currently-failed BotDispatch are checkable.
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [bulkRetrying, setBulkRetrying] = useState(false)
    const reloadRefFunc = useRef(null)

    const hasRetryableDispatch = (order) => {
        const list = order?.BotDispatches || order?.bot_dispatches || []
        if (!Array.isArray(list)) return false
        return list.some(
            (d) => d.status === 'failed' && Number(d.attempt_count || 0) < 5,
        )
    }

    const toggleSelected = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const exitSelectionMode = () => {
        setSelectionMode(false)
        setSelectedIds(new Set())
    }

    const submitBulkRetry = async () => {
        if (selectedIds.size === 0) {
            toast.error('Select at least one order', toastDefault)
            return
        }
        setBulkRetrying(true)
        try {
            const res = await axiosInstance.post(
                '/admin/orders/bot-retry',
                { order_ids: Array.from(selectedIds) },
            )
            const summary = Array.isArray(res?.data?.data) ? res.data.data : []
            const totals = summary.reduce(
                (acc, s) => {
                    acc.retried += Number(s.retried || 0)
                    acc.sent += Number(s.sent || 0)
                    acc.still_failed += Number(s.still_failed || 0)
                    acc.skipped_capped += Number(s.skipped_capped || 0)
                    return acc
                },
                { retried: 0, sent: 0, still_failed: 0, skipped_capped: 0 },
            )
            toast.success(
                `Retried ${totals.retried} across ${summary.length} order(s) — ` +
                    `${totals.sent} sent, ${totals.still_failed} still failed` +
                    (totals.skipped_capped
                        ? `, ${totals.skipped_capped} skipped (capped)`
                        : ''),
                toastDefault,
            )
            exitSelectionMode()
            reloadRefFunc.current && reloadRefFunc.current()
        } catch (err) {
            toast.error(getErrors(err, false, true), toastDefault)
        } finally {
            setBulkRetrying(false)
        }
    }

    // Pull the saved comment templates once on mount and refresh whenever
    // the admin returns to this page. The dropdown in the edit modal is
    // populated from this list (admin can still type a custom note).
    useEffect(() => {
        let cancelled = false
        axiosInstance
            .get('/admin/order-comments')
            .then((res) => {
                if (cancelled) return
                const list = Array.isArray(res?.data?.data) ? res.data.data : []
                setSavedComments(list)
            })
            .catch(() => { /* the dropdown just stays empty */ })
        return () => { cancelled = true }
    }, [])


    const reloadTable = () => reloadRefFunc.current && reloadRefFunc.current()

    let actionMenu = {
        id: 'edit',
        Header: "Action",
        accessor: 'id',
        Cell: (e) => {
            const order = e.row.original
            const status = order.status
            const canEdit = status === 'pending' || status === 'In Progress'
            const hasPlayerId = !!(order.playerid && order.playerid !== 'UNIPIN_VOUCHER')
            // Make View available whenever there are dispatches to inspect
            // (or no playerid — legacy behaviour), so the per-order Retry
            // button inside the modal is always reachable.
            const dispatches = order?.BotDispatches || order?.bot_dispatches || []
            const showView = !hasPlayerId || (Array.isArray(dispatches) && dispatches.length > 0)
            return (
                <ul className="flex space-x-2">
                    {showView && <ViewOrderModal order={order} onUpdated={reloadTable} />}
                    {canEdit && (
                        <li className="cstm_btn_small" onClick={() => openChangeStatusModal(e.value)}>
                            Edit
                        </li>
                    )}
                </ul>
            )
        }
    };

    // Leading checkbox column — only rendered when selectionMode is on.
    // Rows without any retryable failed dispatch render disabled cells so
    // the admin can see at a glance which orders are valid targets.
    const selectionColumn = {
        id: 'select',
        Header: () => {
            // Master checkbox stays simple — toggling it just clears the
            // current selection. (Select-all-across-pages is out of scope.)
            return (
                <input
                    type="checkbox"
                    title="Clear selection"
                    checked={selectedIds.size > 0}
                    onChange={() => setSelectedIds(new Set())}
                />
            )
        },
        accessor: 'id',
        Cell: (e) => {
            const order = e.row.original
            const canSelect = hasRetryableDispatch(order)
            if (!canSelect) {
                return (
                    <span
                        className="text-gray-300"
                        title="No failed dispatches"
                    >
                        —
                    </span>
                )
            }
            return (
                <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleSelected(order.id)}
                />
            )
        },
    }

    const columnsWithSelection = selectionMode
        ? [selectionColumn, ...ordersTableColumns, actionMenu]
        : [...ordersTableColumns, actionMenu]
    const withActionMenu = columnsWithSelection


    const openChangeStatusModal = async (order_id) => {

        // Build the saved-comment picker + datalist from the API-loaded list.
        const savedOptions = savedComments
            .map((c) => {
                const label = c.label || (c.plain_text || '').slice(0, 80)
                return `<option value="${escAttr(c.id)}">${escAttr(label)}</option>`
            })
            .join('')
        const dynamicDatalist = savedComments
            .map((c) => `<option value="${escAttr(c.plain_text)}"></option>`)
            .join('')
        const savedPickerHtml = savedComments.length
            ? `<label class="block text-left mb-2">
                    <span class="form_label">Load saved comment</span>
                    <select id="order-saved-comment" class="form_input">
                        <option value="">-- Select a saved comment --</option>
                        ${savedOptions}
                    </select>
                </label>`
            : `<p class="text-xs text-gray-500 mb-2 text-left">No saved comment templates yet — <a href="/order-comments" class="text-blue-600 underline">create one</a> to reuse here.</p>`

        const { value: formValues } = await Swal.fire({
            title: 'Change order status',
            html:
                `<select id="order-status-value" class="form_input w-full mb-4">
                    <option value="completed" style="font-size: 2em;">Completed</option>
                    <option value="pending" selected style="font-size: 2em;">Pending</option>
                    <option value="In Progress" style="font-size: 2em;">In Progress</option>
                    <option value="cancel" style="font-size: 2em;">Cancel</option>
                </select>` +
                savedPickerHtml +
                `
            <label class="block text-left">
                <span class="form_label">Brief Note</span>
                <textarea rows="3" class="mt-1 block w-full form_input" id="order-note" placeholder="Pick a saved comment above or type your own." list="auto_comment"></textarea>
                <datalist id="auto_comment">
                    <option value="আইডি কোড ভুল"></option>
                    <option value="অন্য সার্ভার এর আইডি"></option>
                    <option value="আইডি/পাসওয়ার্ড ভুল"></option>
                    <option value="এই order টি নেই"></option>
                    <option value="আপনার আইডিতে এই order টি নেই"></option>
                </datalist>
            </label>`,
            didOpen: () => {
                const picker = document.getElementById('order-saved-comment')
                const note = document.getElementById('order-note')
                if (!picker || !note) return
                // When the admin picks a saved comment, copy its plain text
                // into the textarea for previewing/editing AND stash the
                // template's HTML on the textarea via a data-attribute. On
                // submit we prefer the HTML if it's still the original
                // template (textarea unchanged), so the client can render
                // formatting like bold / lists / links.
                picker.addEventListener('change', (e) => {
                    const id = e.target.value
                    if (!id) {
                        note.dataset.html = ''
                        note.dataset.plain = ''
                        return
                    }
                    const found = savedComments.find(
                        (c) => String(c.id) === String(id),
                    )
                    if (found) {
                        note.value = found.plain_text || ''
                        note.dataset.html = found.html || ''
                        note.dataset.plain = found.plain_text || ''
                    }
                })
                // If the admin edits the textarea, drop the cached HTML so we
                // fall back to submitting the typed plain text.
                note.addEventListener('input', () => {
                    if (note.value !== note.dataset.plain) {
                        note.dataset.html = ''
                    }
                })
                // Append the dynamic datalist options (built from API data).
                const dl = document.getElementById('auto_comment')
                if (dl) dl.innerHTML += `${dynamicDatalist}`
            },
            focusConfirm: false,
            preConfirm: () => {
                const orderStatus = document.getElementById('order-status-value').value
                const noteEl = document.getElementById('order-note')
                const plain = noteEl.value
                const cachedHtml = noteEl.dataset.html || ''
                // Prefer the saved-template HTML when the textarea is still
                // the unedited plain rendering of it; otherwise send the raw
                // text the admin typed.
                const orderNote = cachedHtml || plain

                if (!orderStatus) {
                    toast.error('Select an order status', toastDefault)
                    return false
                }

                return { orderStatus, orderNote };
            }
        })


        if (formValues) {
            toast.promise(
                axiosInstance.post(`/admin/order/update-order-status/${order_id}`, {
                    status: formValues.orderStatus,
                    order_note: formValues.orderNote
                }),
                {
                    pending: 'Updating order...',
                    error: {
                        render(err) {
                            console.log(err);
                            return getErrors(err.data, false, true)
                        }
                    },
                    success: {
                        render() {
                            reloadRefFunc.current()
                            return 'Order updated successfully'
                        }
                    }
                },
                toastDefault
            )
        }
    }
    return (
        <div className="md:px-5" >
            <div className="bg-white py-5 mb-5 px-5">
                {/* Bulk retry controls live above the table so they don't
                    conflict with the per-row action menu. Enter selection
                    mode → checkboxes appear → action bar surfaces. */}
                <div className="flex items-center justify-end gap-2 mb-3">
                    {!selectionMode ? (
                        <button
                            type="button"
                            className="cstm_btn_small !bg-blue-600 hover:!bg-blue-700"
                            onClick={() => setSelectionMode(true)}
                        >
                            Bulk retry
                        </button>
                    ) : (
                        <>
                            <span className="text-sm text-gray-600 mr-2">
                                {selectedIds.size} selected
                            </span>
                            <button
                                type="button"
                                disabled={bulkRetrying || selectedIds.size === 0}
                                className="cstm_btn_small !bg-blue-600 hover:!bg-blue-700 disabled:opacity-60"
                                onClick={submitBulkRetry}
                            >
                                {bulkRetrying
                                    ? 'Retrying…'
                                    : `Retry selected (${selectedIds.size})`}
                            </button>
                            <button
                                type="button"
                                className="cstm_btn_small !bg-gray-300 !text-gray-800 hover:!bg-gray-400"
                                onClick={exitSelectionMode}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
                <Table
                    customGlobalSearch={({ addSearchParam, removeSearchParam }) => (
                        <SearchOrder addSearchParam={addSearchParam} removeSearchParam={removeSearchParam} />
                    )}
                    reloadRefFunc={reloadRefFunc}
                    tableTitle="Product Orders"
                    tableSubTitle={hasData(totalDataCount) && `Total result: ${totalDataCount}`}
                    globalSearchPlaceholder="Product id or user id"
                    tableId="order_table"
                    url="/admin/orders"
                    selectData={(res) => {
                        setTotalDataCount(res.data.data.order_count)

                        return {
                            data: res.data.data.orders,
                            total: res.data.data.order_count,
                        }
                    }}
                    queryString="order_id"
                    disableGlobalSearch
                    selectError={(err) => getErrors(err, true)[0]}
                    columns={withActionMenu}
                />
            </div>
        </div>
    )
}

export default Orders