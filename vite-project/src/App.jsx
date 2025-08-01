import  { useState, useEffect } from "react";
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
  const [clipboard, setClipboard] = useState(null); // { node, type: 'copy' | 'cut' }
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
  }, [treeData]);

  // Central update function
  const updateTree = (newData) => {
    setHistory((prev) => [...prev, treeData]);
    setFuture([]);
    setTreeData(newData);
  };

  const addNode = (key) => {
    const newNode = {
      title: "New Node",
      key: Date.now().toString(),
      children: [],
    };
    updateTree(addChildNode(treeData, key, newNode));
    setExpandedKeys((keys) => [...new Set([...keys, key])]);
  };

  const renameNode = (key) => {
    const newTitle = prompt("Enter new name:");
    if (newTitle) {
      updateTree(renameNodeByKey(treeData, key, newTitle));
    }
  };

  const deleteNode = (key) => {
    updateTree(deleteNodeByKey(treeData, key));
  };

  const copyNode = (node) => {
    setClipboard({ node, type: "copy" });
  };

  const cutNode = (node) => {
    setClipboard({ node, type: "cut" });
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
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [treeData, ...f]);
    setHistory((h) => h.slice(0, -1));
    setTreeData(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, treeData]);
    setFuture((f) => f.slice(1));
    setTreeData(next);
  };

  const expandAll = () => {
    setExpandedKeys(getAllKeys(treeData));
  };

  const collapseAll = () => {
    setExpandedKeys([]);
  };

  const renderTitle = (node) => (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span>{node.title}</span>
      <button onClick={() => addNode(node.key)}>➕</button>
      <button onClick={() => renameNode(node.key)}>✏️</button>
      <button onClick={() => deleteNode(node.key)}>🗑️</button>
      <button onClick={() => copyNode(node)}>📄</button>
      <button onClick={() => cutNode(node)}>✂️</button>
      <button onClick={() => pasteNode(node.key)} disabled={!clipboard}>
        📋
      </button>
    </div>
  );

  const transformedTree = transformTreeWithTitleRenderer(treeData, renderTitle);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <button onClick={expandAll}>🔼 Expand All</button>
        <button onClick={collapseAll}>🔽 Collapse All</button>
        <button onClick={undo} disabled={history.length === 0}>
          ↩️ Undo
        </button>
        <button onClick={redo} disabled={future.length === 0}>
          ↪️ Redo
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
      return { ...node, children: [...(node.children || []), newNode] };
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
