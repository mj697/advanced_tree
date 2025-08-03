import { useState, useEffect } from "react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

const STORAGE_KEY = "my-rc-tree-data";

export default function RcTreeExample() {
  const [treeData, setTreeData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved//if we have a saved data in local storage then set it as treeData else set it as default data
      ? JSON.parse(saved)
      : [{ title: "Root", key: "0", children: [] }];//the structure of each node data
  });
  const [expandedKeys, setExpandedKeys] = useState(["0"]);//gathers new node keys as they are added
  const [clipboard, setClipboard] = useState(null);
  //setter used in copyNode, cutNode and pasteNode its state is only used in pasteNode(targetKey)
  const [history, setHistory] = useState([]);//this is the exact opposite of future state
  const [future, setFuture] = useState([]);//this is the exact opposite of history state
  const [newlyAddedKeys, setNewlyAddedKeys] = useState([]);
  const [lastClickedKey, setLastClickedKey] = useState(null);//for style
  const [readOnly, setReadOnly] = useState(false);
  //these three states are all search-related:
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
  }, [treeData]);

  const updateTree = (newData) => {
    setHistory((prev) => [...prev, treeData]);
    //having all old treeData state plus current treeData (not to be mistaken with newData which the latest data)
    setFuture([]);//the latest thing that happens is the next line
    setTreeData(newData);
  };

  const addNode = (key) => {//Create Node
    const newKey = Date.now().toString();
    const newNode = {
      title: "New Node",
      key: newKey,
      children: [],
    };
    updateTree(addChildNode(treeData, key, newNode));
    setExpandedKeys((keys) => [...new Set([...keys, key])]);//for rc-tree
    setNewlyAddedKeys((prev) => [...prev, newKey]);//style
    setLastClickedKey(newKey);//style
    setTimeout(() => {//style
      setNewlyAddedKeys((prev) => prev.filter((k) => k !== newKey));
    }, 1000);
  };
  const renameNode = (key) => {//Update node
    const currentNode = findNodeByKey(treeData, key);
    const newTitle = prompt("Enter new name:", currentNode?.title || "");
    if (newTitle) {
      updateTree(renameNodeByKey(treeData, key, newTitle));
      setLastClickedKey(key);//for style
    }
  };
  const deleteNode = (key) => {//Delete node
    if (key === "0") return;//Root node will always remain
    updateTree(deleteNodeByKey(treeData, key));
    setLastClickedKey(null);//for style
  };

  const copyNode = (node) => {
    setClipboard({ node, type: "copy" });//node [and all its children]
    setLastClickedKey(node.key);//for style
  };
  const cutNode = (node) => {
    if (node.key === "0") return;
    setClipboard({ node, type: "cut" });//node [and all its children]
    setLastClickedKey(node.key);//for style
  };
  const pasteNode = (targetKey) => {
    if (!clipboard) return;
    const newNode = {
      ...clipboard.node,
      key: Date.now().toString(),//make this entry unique
      children: cloneChildren(clipboard.node.children || []),//bringing also the children to newNode here
    };

    let updated = addChildNode(treeData, targetKey, newNode);//act of pasting whether we had copy or cut
    if (clipboard.type === "cut") {
      updated = deleteNodeByKey(updated, clipboard.node.key);
    }

    updateTree(updated);
    setClipboard(null);
    setLastClickedKey(targetKey);//style
  };

   const renderNode = (node) => {//prints each node
    //style
    const isNew = newlyAddedKeys.includes(node.key);
    const isLastClicked = node.key === lastClickedKey;
    const isMatched = matches.includes(node.key);
    const bgColor = isNew
      ? "#d4edda"
      : isMatched
      ? "#ffeeba"
      : isLastClicked
      ? "#fff3cd"
      : "transparent";
    //style

    return (//it is not the final outcome of the component
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: bgColor,
          padding: "2px 4px",
          borderRadius: "4px",
          transition: "background-color 0.3s ease",
        }}
        onClick={() => setLastClickedKey(node.key)}//for style
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

        {/* style */}
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
        {/* style */}

      </div>
    );
  };

  const undo = () => {//vice versa of redo
    if (history.length === 0 || readOnly) return;
    const prev = history[history.length - 1];

    setFuture((f) => [treeData, ...f]);
    setHistory((h) => h.slice(0, -1));

    setTreeData(prev);
  };
  const redo = () => {//vice versa of undo
    if (future.length === 0 || readOnly) return;
    const next = future[0];

    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, treeData]); 

    setTreeData(next);
  };

  const expandAll = () => setExpandedKeys(getAllKeys(treeData));//setExpandedKeys and its state are used in rc-tree
  const collapseAll = () => setExpandedKeys([]);

  const searchAndScroll = (term) => {
    if (!term) return;
    const matchedNodes = [];
    //const parentsToExpand = new Set();

    const traverse = (nodes, ancestors = []) => {
      for (const node of nodes) {
        if (node.title.toLowerCase().includes(term.toLowerCase())) {
          matchedNodes.push({ key: node.key, ancestors });
        }
        if (node.children) {
          traverse(node.children, [...ancestors, node.key]);
        }
      }
    };

    traverse(treeData);
    
    if (matchedNodes.length === 0) {
      alert("No matches found.");
      return;
    }

    const match = matchedNodes[currentMatchIndex % matchedNodes.length];
    const allKeys = [...new Set([...expandedKeys, ...match.ancestors])];

    setExpandedKeys(allKeys);
    setMatches(matchedNodes.map((m) => m.key));
    setCurrentMatchIndex((prev) => (prev + 1) % matchedNodes.length);

    setTimeout(() => {
      const el = document.querySelector(`[data-key="${match.key}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const transformedTree = nodeRendererHelper(treeData, renderNode);

  return (//it is the final outcome of the component
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
         <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchAndScroll(searchTerm)}
          style={{
            padding: "4px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <Tree
        treeData={transformedTree}// FINAL NODES DATA
        expandedKeys={expandedKeys}// rc-tree will expand all nodes with their given keys (ids)
        onExpand={setExpandedKeys}// informing rc-tree of expanded node keys (ids)
      />
    </div>
  );
}

//------------------------------------------

function addChildNode(nodes, key, newNode) {//used in pasteNode and addNode
  //"nodes" param are the most recent treeData
  return nodes.map((node) => {
    if (node.key === key) {
      return { ...node, children: [newNode, ...(node.children || [])] };//adding newNode as the first child
    }
    if (node.children) {
      return { ...node, children: addChildNode(node.children, key, newNode) };//calling this function on the possible children
    }
    return node;
  });
}

function renameNodeByKey(nodes, key, newTitle) {//used only in Update node (renameNode)
  return nodes.map((node) => {
    if (node.key === key) return { ...node, title: newTitle };
    if (node.children) {
      return {
        ...node,
        children: renameNodeByKey(node.children, key, newTitle),//calling this function on the possible children
      };
    }
    return node;
  });
}

function deleteNodeByKey(nodes, key) {//used in pasteNode (cut mode) and Delete node (deleteNode)
  return nodes
    .map((node) => {
      if (node.key === key) return null;//nullifying the father node upon finding it
      if (node.children) {//else going in the children and trying to find the target node in them
        return { ...node, children: deleteNodeByKey(node.children, key) };//calling this function on the possible children
      }
      return node;
    })
    .filter(Boolean);
}

function cloneChildren(children) {//used only in pasteNode
  return children.map((child) => ({
    ...child,
    key: Date.now().toString() + Math.random(),
    children: child.children ? cloneChildren(child.children) : [],//calling this function on the possible children
  }));
}

function nodeRendererHelper(treeData, renderFn) {//used only when rendering nodes
  //2nd param is renderNode which prints each node by returning a div element
  return treeData.map((node) => {//turning js objects into real html divs via renderFn
    const newNode = { ...node, title: renderFn(node) };
    if (node.children) {
      newNode.children = nodeRendererHelper(//calling this function on the possible children
        node.children,
        renderFn
      );
    }
    return newNode;//returning rendered nodes and their children
  });
}

function getAllKeys(nodes) {//only used in expandAll function
  let keys = [];
  for (const node of nodes) {
    keys.push(node.key);
    if (node.children) {
      keys = keys.concat(getAllKeys(node.children));//calling this function on the possible children
    }
  }
  return keys;
}

function findNodeByKey(nodes, key) {//only used when renaming (Updating) nodes
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);//calling this function on the possible children
      if (found) return found;
    }
  }
  return null;
}
