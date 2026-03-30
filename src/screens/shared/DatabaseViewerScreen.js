// screens/shared/DatabaseViewerScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import databaseService from "../../database";

export default function DatabaseViewerScreen({ navigation }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [columns, setColumns] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // List of tables in our database (you can update this with actual table names)
  const tableNames = [
    "users",
    "user_profiles",
    "businesses",
    "shops",
    "employees",
    "categories",
    "products",
    "inventory",
    "customers",
    "sales",
    "sale_items",
    "payments",
    "price_history",
    "sync_logs",
    "app_settings",
  ];

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const db = await databaseService.openDatabase();

      // Get table info
      const tableInfo = [];

      for (const tableName of tableNames) {
        try {
          // Try to get row count
          const countResult = await db.getFirstAsync(
            `SELECT COUNT(*) as count FROM ${tableName}`
          );
          tableInfo.push({
            name: tableName,
            count: countResult?.count || 0,
          });
        } catch (error) {
          // Table might not exist
          console.log(`Table ${tableName} not found or error:`, error.message);
        }
      }

      setTables(tableInfo);
    } catch (error) {
      console.error("Error loading tables:", error);
      Alert.alert("Error", "Failed to load database tables");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableData = async (tableName) => {
    try {
      setIsLoadingData(true);
      setSelectedTable(tableName);
      setTableData([]);
      setColumns([]);
      setExpandedRow(null);

      const db = await databaseService.openDatabase();

      // First, get column names
      const columnInfo = await db.getAllAsync(
        `PRAGMA table_info(${tableName})`
      );
      const columnNames = columnInfo.map((col) => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        pk: col.pk,
      }));
      setColumns(columnNames);

      // Get table data with pagination
      let query = `SELECT * FROM ${tableName}`;
      const params = [];

      if (searchQuery) {
        // Build search condition
        const searchConditions = columnNames
          .filter((col) => {
            // Only search text columns
            const type = col.type.toLowerCase();
            return (
              type.includes("text") ||
              type.includes("char") ||
              type.includes("varchar")
            );
          })
          .map((col) => `${col.name} LIKE ?`);

        if (searchConditions.length > 0) {
          query += ` WHERE ${searchConditions.join(" OR ")}`;
          params.push(
            `%${searchQuery}%`.repeat(searchConditions.length).split("%")
          );
        }
      }

      query += " ORDER BY id DESC LIMIT 100";

      console.log(`Executing query: ${query}`, params);

      const data = await db.getAllAsync(query, params.flat());
      setTableData(data);
    } catch (error) {
      console.error(`Error loading table ${tableName}:`, error);
      Alert.alert(
        "Error",
        `Failed to load data from ${tableName}: ${error.message}`
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  const toggleRowExpansion = (rowId) => {
    setExpandedRow(expandedRow === rowId ? null : rowId);
  };

  const renderTableItem = ({ item }) => (
    <TouchableOpacity
      style={styles.tableItem}
      onPress={() => loadTableData(item.name)}
    >
      <View style={styles.tableHeader}>
        <View style={styles.tableNameContainer}>
          <Ionicons name="grid-outline" size={20} color="#FF6B00" />
          <Text style={styles.tableName}>{item.name}</Text>
        </View>
        <View style={styles.tableInfo}>
          <Text style={styles.rowCount}>{item.count} rows</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={selectedTable === item.name ? "#FF6B00" : "#ccc"}
          />
        </View>
      </View>
      {selectedTable === item.name && isLoadingData && (
        <ActivityIndicator
          size="small"
          color="#FF6B00"
          style={styles.loadingIndicator}
        />
      )}
    </TouchableOpacity>
  );

  const renderTableDataRow = ({ item, index }) => {
    const isExpanded = expandedRow === index;

    return (
      <TouchableOpacity
        style={[styles.dataRow, isExpanded && styles.expandedRow]}
        onPress={() => toggleRowExpansion(index)}
      >
        <View style={styles.rowHeader}>
          <View style={styles.rowIdContainer}>
            <Text style={styles.rowId}>Row {index + 1}</Text>
            {item.id && <Text style={styles.rowIdValue}>ID: {item.id}</Text>}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
          />
        </View>

        {isExpanded && (
          <View style={styles.rowDetails}>
            {columns.map((column, colIndex) => (
              <View key={colIndex} style={styles.columnItem}>
                <Text style={styles.columnName}>
                  {column.name} ({column.type}){column.pk ? " 🔑" : ""}
                  {column.notnull ? " ⚠️" : ""}
                </Text>
                <Text style={styles.columnValue}>
                  {item[column.name] !== null && item[column.name] !== undefined
                    ? String(item[column.name])
                    : "NULL"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderColumnHeader = () => (
    <View style={styles.columnsHeader}>
      <Text style={styles.columnsTitle}>Columns ({columns.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.columnsList}>
          {columns.map((column, index) => (
            <View key={index} style={styles.columnBadge}>
              <Text style={styles.columnBadgeText}>
                {column.name}
                {column.pk ? " 🔑" : ""}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const clearSelection = () => {
    setSelectedTable(null);
    setTableData([]);
    setColumns([]);
    setExpandedRow(null);
  };

  const exportData = () => {
    if (!selectedTable) return;

    const dataStr = JSON.stringify(
      {
        table: selectedTable,
        columns: columns,
        data: tableData,
        timestamp: new Date().toISOString(),
        rowCount: tableData.length,
      },
      null,
      2
    );

    Alert.alert(
      "Export Data",
      `Table: ${selectedTable}\nRows: ${tableData.length}\nColumns: ${columns.length}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy to Clipboard",
          onPress: async () => {
            // You would need to install and use @react-native-clipboard/clipboard
            // For now, just show an alert
            Alert.alert(
              "Info",
              "Data would be copied to clipboard. Install @react-native-clipboard/clipboard to enable this feature."
            );
          },
        },
        {
          text: "Log to Console",
          onPress: () => {
            console.log(`=== ${selectedTable} Table Data ===`);
            console.log(dataStr);
            Alert.alert("Success", "Data logged to console");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Viewer</Text>
        <View style={styles.headerRight}>
          {selectedTable && (
            <TouchableOpacity style={styles.headerButton} onPress={exportData}>
              <Ionicons name="download-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={loadTables}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search in ${selectedTable || "tables"}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => selectedTable && loadTableData(selectedTable)}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              selectedTable && loadTableData(selectedTable);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading database...</Text>
        </View>
      ) : selectedTable ? (
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.selectedTableHeader}>
            <View style={styles.tableTitleRow}>
              <View style={styles.tableTitle}>
                <Ionicons name="grid" size={24} color="#FF6B00" />
                <Text style={styles.selectedTableName}>{selectedTable}</Text>
              </View>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSelection}
              >
                <Ionicons name="close" size={20} color="#666" />
                <Text style={styles.clearButtonText}>Back to Tables</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tableStats}>
              {tableData.length} rows • {columns.length} columns
            </Text>
          </View>

          {/* Columns Info */}
          {renderColumnHeader()}

          {/* Data List */}
          {isLoadingData ? (
            <View style={styles.dataLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={styles.dataLoadingText}>Loading data...</Text>
            </View>
          ) : tableData.length > 0 ? (
            <FlatList
              data={tableData}
              renderItem={renderTableDataRow}
              keyExtractor={(item, index) => `row-${index}`}
              contentContainerStyle={styles.dataList}
              showsVerticalScrollIndicator={true}
              initialNumToRender={10}
              maxToRenderPerBatch={20}
            />
          ) : (
            <View style={styles.emptyDataContainer}>
              <Ionicons name="warning-outline" size={60} color="#ccc" />
              <Text style={styles.emptyDataText}>No data found</Text>
              <Text style={styles.emptyDataSubtext}>
                {searchQuery ? "Try a different search term" : "Table is empty"}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.tablesContainer}>
          <Text style={styles.tablesTitle}>
            Database Tables ({tables.length})
          </Text>
          <Text style={styles.tablesSubtitle}>
            Tap a table to view its contents
          </Text>

          <FlatList
            data={tables}
            renderItem={renderTableItem}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.tablesList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  tablesContainer: {
    flex: 1,
    padding: 16,
  },
  tablesTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  tablesSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  tablesList: {
    paddingBottom: 20,
  },
  tableItem: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  tableInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowCount: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  loadingIndicator: {
    marginTop: 8,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  selectedTableHeader: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tableTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedTableName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 12,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  tableStats: {
    fontSize: 14,
    color: "#666",
  },
  columnsHeader: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  columnsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  columnsList: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  columnBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  columnBadgeText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
  },
  dataLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  dataLoadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  dataList: {
    padding: 16,
    paddingBottom: 100,
  },
  dataRow: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  expandedRow: {
    backgroundColor: "#f8f9fa",
    borderColor: "#FF6B00",
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowIdContainer: {
    flex: 1,
  },
  rowId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  rowIdValue: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  rowDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  columnItem: {
    marginBottom: 12,
  },
  columnName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  columnValue: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyDataText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptyDataSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
});
