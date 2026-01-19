# Issue #3: Not displaying row as changed in diff when one of children changed (run-diff)

**State:** OPEN

**URL:** https://github.com/ts-factory/bublik-ui/issues/3

## Description

When package node is not changed in any way but somewhere deep in nested children there's a change parent node doesn't have correct diff-type.

So change deep in tree should be propagated to all parent packages

