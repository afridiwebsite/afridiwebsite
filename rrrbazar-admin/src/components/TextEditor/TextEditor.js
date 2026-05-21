import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import {
    AtomicBlockUtils,
    EditorState,
    Modifier,
    RichUtils,
    SelectionState,
} from 'draft-js';
import { convertToHTML, convertFromHTML } from 'draft-convert';
import {
    draftFromHTMLConfig,
    draftToHTMLConfig,
} from '../../utils/draftEditor.utils';

// Default image-upload handler: inlines as a base64 data URL so the editor
// works without a separate upload pipeline. Callers can pass `onUploadImage`
// to swap in a real upload.
function defaultUploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ data: { link: reader.result } });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Full toolbar with image, color, font, links, list, alignment, etc. Pulled
// out so individual usages can tweak it (e.g. drop the image block).
const DEFAULT_TOOLBAR = {
    options: [
        'inline',
        'blockType',
        'fontSize',
        'fontFamily',
        'list',
        'textAlign',
        'colorPicker',
        'link',
        'image',
        'remove',
        'history',
    ],
    inline: {
        options: ['bold', 'italic', 'underline', 'strikethrough', 'monospace'],
    },
    list: { options: ['unordered', 'ordered'] },
    textAlign: { options: ['left', 'center', 'right', 'justify'] },
    link: { defaultTargetOption: '_blank' },
    image: {
        alt: { present: true, mandatory: false },
        previewImage: true,
        inputAccept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
        defaultSize: { height: 'auto', width: 'auto' },
    },
};

// Convert HTML → EditorState using the shared parsing config (handles
// images, colors, links). Falls back to empty editor on parse failure so
// a malformed string can't crash the whole form.
function fromHtml(html) {
    if (!html) return EditorState.createEmpty();
    try {
        return EditorState.createWithContent(
            convertFromHTML(draftFromHTMLConfig)(html),
        );
    } catch (e) {
        return EditorState.createEmpty();
    }
}

// Convert EditorState → HTML. Pulled out so callers don't have to import
// draft-convert + the configs themselves.
export function editorStateToHtml(state) {
    if (!state) return '';
    try {
        return convertToHTML(draftToHTMLConfig)(state.getCurrentContent());
    } catch (e) {
        return '';
    }
}

function TextEditor({
    value,
    onChange,
    onHtmlChange,
    placeholder,
    minHeight = 220,
    wrapperStyle,
    editorStyle,
    toolbar,
    onUploadImage,
    disabled,
    className,
}) {
    const [editorState, setEditorState] = useState(() => fromHtml(value));
    // Track the most recent `value` we hydrated from, so a parent updating
    // it later (e.g. data finishing load) seeds the editor — but a parent
    // re-rendering with the same value doesn't clobber in-progress edits.
    const lastSeededRef = useRef(value || '');

    useEffect(() => {
        const next = value || '';
        if (next === lastSeededRef.current) return;
        lastSeededRef.current = next;
        setEditorState(fromHtml(next));
    }, [value]);

    const uploadImage = onUploadImage || defaultUploadImage;

    const mergedToolbar = {
        ...DEFAULT_TOOLBAR,
        ...(toolbar || {}),
        image: {
            ...DEFAULT_TOOLBAR.image,
            uploadCallback: uploadImage,
            ...(toolbar?.image || {}),
        },
    };

    const emitChange = useCallback(
        (state) => {
            setEditorState(state);
            if (onChange || onHtmlChange) {
                const html = editorStateToHtml(state);
                lastSeededRef.current = html;
                onChange && onChange(html, state);
                onHtmlChange && onHtmlChange(html);
            }
        },
        [onChange, onHtmlChange],
    );

    // Backspace/Delete on an atomic block (image, etc.) only removes the
    // entity by default — the atomic block itself stays as a 0-char
    // placeholder, so the next save still emits the <img>. Detect that
    // case and remove the whole block.
    const handleKeyCommand = useCallback(
        (command, state) => {
            if (command !== 'backspace' && command !== 'delete') {
                const next = RichUtils.handleKeyCommand(state, command);
                if (next) {
                    emitChange(next);
                    return 'handled';
                }
                return 'not-handled';
            }
            const selection = state.getSelection();
            if (!selection.isCollapsed()) return 'not-handled';
            const content = state.getCurrentContent();
            const blockKey = selection.getStartKey();
            const block = content.getBlockForKey(blockKey);
            if (!block) return 'not-handled';

            // If the cursor is inside an atomic block, wipe the whole
            // block. Modifier.removeRange + a fresh selection that spans
            // the block does the trick.
            if (block.getType() === 'atomic') {
                const blockSelection = new SelectionState({
                    anchorKey: blockKey,
                    anchorOffset: 0,
                    focusKey: blockKey,
                    focusOffset: block.getLength(),
                });
                const without = Modifier.removeRange(
                    content,
                    blockSelection,
                    'backward',
                );
                const cleaned = Modifier.setBlockType(
                    without,
                    without.getSelectionAfter(),
                    'unstyled',
                );
                const next = EditorState.push(state, cleaned, 'remove-range');
                emitChange(next);
                return 'handled';
            }

            // Backspace at the very start of a block that comes right after
            // an atomic block: nuke the atomic block above instead of doing
            // nothing (default behavior leaves the image in place).
            if (command === 'backspace' && selection.getStartOffset() === 0) {
                const prevKey = content.getKeyBefore(blockKey);
                const prev = prevKey ? content.getBlockForKey(prevKey) : null;
                if (prev && prev.getType() === 'atomic') {
                    const blockSelection = new SelectionState({
                        anchorKey: prevKey,
                        anchorOffset: 0,
                        focusKey: prevKey,
                        focusOffset: prev.getLength(),
                    });
                    const without = Modifier.removeRange(
                        content,
                        blockSelection,
                        'backward',
                    );
                    const next = EditorState.push(state, without, 'remove-range');
                    emitChange(next);
                    return 'handled';
                }
            }

            const handled = RichUtils.handleKeyCommand(state, command);
            if (handled) {
                emitChange(handled);
                return 'handled';
            }
            return 'not-handled';
        },
        [emitChange],
    );

    return (
        <Editor
            editorState={editorState}
            onEditorStateChange={emitChange}
            handleKeyCommand={handleKeyCommand}
            placeholder={placeholder}
            readOnly={!!disabled}
            wrapperClassName={className}
            editorStyle={{ minHeight, padding: '0 12px', ...editorStyle }}
            wrapperStyle={{
                border: '1px solid #dcdcf3',
                borderRadius: 6,
                ...wrapperStyle,
            }}
            toolbar={mergedToolbar}
        />
    );
}

export default TextEditor;
