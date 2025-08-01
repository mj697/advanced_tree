import { useState, useEffect } from "react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

const STORAGE_KEY = "my-rc-tree-data";

export default function RcTreeExample() {
  const [treeData, setTreeData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : [{ title: "Root", key: "0", children: [] }];
  });

  const [expandedKeys, setExpandedKeys] = useState(["0"]);
  const [clipboard, setClipboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [newlyAddedKeys, setNewlyAddedKeys] = useState([]);
  const [lastClickedKey, setLastClickedKey] = useState(null);
  const [readOnly, setReadOnly] = useState(false); // 👈 Restored

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
  }, [treeData]);

  const updateTree = (newData) => {
    setHistory((prev) => [...prev, treeData]);
    setFuture([]);
    setTreeData(newData);
  };

  const addNode = (key) => {
    const newKey = Date.now().toString();
    const newNode = {
      title: "New Node",
      key: newKey,
      children: [],
    };
    updateTree(addChildNode(treeData, key, newNode));
    setExpandedKeys((keys) => [...new Set([...keys, key])]);
    setNewlyAddedKeys((prev) => [...prev, newKey]);
    setLastClickedKey(newKey);
    setTimeout(() => {
      setNewlyAddedKeys((prev) => prev.filter((k) => k !== newKey));
    }, 1000);
  };

  const renameNode = (key) => {
    const currentNode = findNodeByKey(treeData, key);
    const newTitle = prompt("Enter new name:", currentNode?.title || "");
    if (newTitle) {
      updateTree(renameNodeByKey(treeData, key, newTitle));
      setLastClickedKey(key);
    }
  };

  const deleteNode = (key) => {
    if (key === "0") return;
    updateTree(deleteNodeByKey(treeData, key));
    setLastClickedKey(null);
  };

  const copyNode = (node) => {
    setClipboard({ node, type: "copy" });
    setLastClickedKey(node.key);
  };

  const cutNode = (node) => {
    if (node.key === "0") return;
    setClipboard({ node, type: "cut" });
    setLastClickedKey(node.key);
  };

  const pasteNode = (targetKey) => {
    if (!clipboard) return;
    const newNode = {
      ...clipboard.node,
      key: Date.now().toString(),
      children: cloneChildren(clipboard.node.children || []),
    };

    let updated = addChildNode(treeData, targetKey, newNode);
    if (clipboard.type === "cut") {
      updated = deleteNodeByKey(updated, clipboard.node.key);
    }

    updateTree(updated);
    setClipboard(null);
    setLastClickedKey(targetKey);
  };

  const undo = () => {
    if (history.length === 0 || readOnly) return;
    const prev = history[history.length - 1];
    setFuture((f) => [treeData, ...f]);
    setHistory((h) => h.slice(0, -1));
    setTreeData(prev);
  };

  const redo = () => {
    if (future.length === 0 || readOnly) return;
    const next = future[0];
    setHistory((h) => [...h, treeData]);
    setFuture((f) => f.slice(1));
    setTreeData(next);
  };

  const expandAll = () => setExpandedKeys(getAllKeys(treeData));
  const collapseAll = () => setExpandedKeys([]);

  const renderTitle = (node) => {
    const isNew = newlyAddedKeys.includes(node.key);
    const isLastClicked = node.key === lastClickedKey;
    const bgColor = isNew
      ? "#d4edda"
      : isLastClicked
      ? "#fff3cd"
      : "transparent";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: bgColor,
          padding: "2px 4px",
          borderRadius: "4px",
          transition: "background-color 0.3s ease",
        }}
        onClick={() => setLastClickedKey(node.key)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{node.title}</span>
          {!readOnly && (
            <>
              <button onClick={() => addNode(node.key)}>➕</button>
              <button onClick={() => renameNode(node.key)}>✏️</button>
              <button
                onClick={() => deleteNode(node.key)}
                disabled={node.key === "0"}
              >
                🗑️
              </button>
              <button onClick={() => copyNode(node)}>📄</button>
              <button onClick={() => cutNode(node)} disabled={node.key === "0"}>
                ✂️
              </button>
              <button onClick={() => pasteNode(node.key)} disabled={!clipboard}>
                📋
              </button>
            </>
          )}
        </div>
        {isNew && (
          <div
            style={{
              height: "1px",
              backgroundColor: "#ccc",
              margin: "4px 0",
              width: "100%",
            }}
          />
        )}
      </div>
    );
  };

  const transformedTree = transformTreeWithTitleRenderer(treeData, renderTitle);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10, display: "flex", gap: "10px" }}>
        <button onClick={expandAll}>🔼 Expand All</button>
        <button onClick={collapseAll}>🔽 Collapse All</button>
        <button onClick={undo} disabled={history.length === 0 || readOnly}>
          ↩️ Undo
        </button>
        <button onClick={redo} disabled={future.length === 0 || readOnly}>
          ↪️ Redo
        </button>
        <button onClick={() => setReadOnly((v) => !v)}>
          {readOnly ? "🔓 Make Editable" : "🔒 Read-Only Mode"}
        </button>
      </div>
      <Tree
        treeData={transformedTree}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
      />
    </div>
  );
}

function addChildNode(nodes, key, newNode) {
  return nodes.map((node) => {
    if (node.key === key) {
      return { ...node, children: [newNode, ...(node.children || [])] };
    }
    if (node.children) {
      return { ...node, children: addChildNode(node.children, key, newNode) };
    }
    return node;
  });
}

function renameNodeByKey(nodes, key, newTitle) {
  return nodes.map((node) => {
    if (node.key === key) return { ...node, title: newTitle };
    if (node.children) {
      return {
        ...node,
        children: renameNodeByKey(node.children, key, newTitle),
      };
    }
    return node;
  });
}

function deleteNodeByKey(nodes, key) {
  return nodes
    .map((node) => {
      if (node.key === key) return null;
      if (node.children) {
        return { ...node, children: deleteNodeByKey(node.children, key) };
      }
      return node;
    })
    .filter(Boolean);
}

function cloneChildren(children) {
  return children.map((child) => ({
    ...child,
    key: Date.now().toString() + Math.random(),
    children: child.children ? cloneChildren(child.children) : [],
  }));
}

function transformTreeWithTitleRenderer(treeData, renderFn) {
  return treeData.map((node) => {
    const newNode = { ...node, title: renderFn(node) };
    if (node.children) {
      newNode.children = transformTreeWithTitleRenderer(
        node.children,
        renderFn
      );
    }
    return newNode;
  });
}

function getAllKeys(nodes) {
  let keys = [];
  for (const node of nodes) {
    keys.push(node.key);
    if (node.children) {
      keys = keys.concat(getAllKeys(node.children));
    }
  }
  return keys;
}

function findNodeByKey(nodes, key) {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}
