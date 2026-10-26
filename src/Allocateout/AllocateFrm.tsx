import React, { useState, useCallback, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
    ActivityIndicator,
    Image,
    Dimensions,
    DeviceEventEmitter,
} from "react-native";
import { useGlobal } from "../../GlobalContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Même code scanné dans cet intervalle = ignoré
const DUPLICATE_WINDOW_MS = 2000;
// Même insertion (code + type) dans cet intervalle = ignorée
const INSERT_DUPLICATE_WINDOW_MS = 3000;
// Si la navigation n'a pas eu lieu, on libère le verrou après ce délai
const NAV_LOCK_FAILSAFE_MS = 1500;

type RowType = {
    palletCode: string;
    boxCode: string;
    sn: string;
    model: string;
    color: string;
    boxQty: string;
};

const columns = [
    { label: "Pallet", width: 120 },
    { label: "Box ", width: 120 },
    { label: "SN ", width: 120 },
    { label: "Model", width: 110 },
    { label: "Color", width: 90 },
    { label: "Qty", width: 60 },
];

const totalTableWidth = columns.reduce((acc, col) => acc + col.width, 0);

export default function AllocateFrm({ navigation, route }: any) {
    const { allocateCode } = route.params || { allocateCode: "" };

    const global = useGlobal();
    const {
        gsURL,
        gs_factoryCode,
        gs_factoryindex,
        gs_wareCode,
        gs_wareType,
        gs_classCode,
        gs_groupCode,
        gs_workdate,
        gs_userCode,
        gs_userName,
        operateUserCode,
        operateUserName,
        operateWareHouseCode,
        operateRandomNumber,
        operateSign,
        operateVersion,
    } = global;
    const BASE_URL = gsURL;
    const factoryColor = gs_factoryindex === "zentech" ? "#06b86c" : "#0052cc";
    const [token, setToken] = useState("");

    const [barcode, setBarcode] = useState("");
    const [toCkName, setToCkName] = useState("");
    const [totalQty, setTotalQty] = useState("");
    const [tableData, setTableData] = useState<RowType[]>([]);
    const [loading, setLoading] = useState(false);
    const showKeyboard = false;

    const inputRef = useRef<TextInput>(null);

    // Protections anti double scan / double insertion
    const isScanning = useRef(false);
    const inserting = useRef(false);
    const barcodeRef = useRef("");
    const lastScan = useRef<{ code: string; time: number }>({ code: "", time: 0 });
    const lastInsert = useRef<{ key: string; time: number }>({ key: "", time: 0 });
    const lockTimer = useRef<any>(null);

    const [scanState, setScanState] = useState<
        "waiting" | "scanning" | "success" | "error"
    >("waiting");

    /* ------------------------------------------------------------------ */
    /* Focus                                                              */
    /* ------------------------------------------------------------------ */
    const ensureFocus = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Au retour sur l'écran : libère le verrou et redonne le focus à l'input
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            clearTimeout(lockTimer.current);
            isScanning.current = false;
            setTimeout(() => inputRef.current?.focus(), 100);
        });
        return () => {
            unsubscribe();
            clearTimeout(lockTimer.current);
        };
    }, [navigation]);

    // Sécurité : si la navigation n'a pas abouti, on ne reste pas bloqué
    const armLockFailsafe = () => {
        clearTimeout(lockTimer.current);
        lockTimer.current = setTimeout(() => {
            if (navigation.isFocused()) {
                isScanning.current = false;
            }
        }, NAV_LOCK_FAILSAFE_MS);
    };

    /* ------------------------------------------------------------------ */
    /* Token                                                              */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const loadToken = async () => {
            const t = await AsyncStorage.getItem("userToken");
            if (t) setToken(t);
        };

        loadToken();
    }, []);

    /* ------------------------------------------------------------------ */
    /* Vérification du bon d'allocation                                   */
    /* ------------------------------------------------------------------ */
    const fetchAllocateCheck = useCallback(async () => {
        if (!allocateCode) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/AllocateCheck`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    operateUserCode,
                    operateUserName,
                    operateWareHouseCode,
                    operateRandomNumber,
                    operateSign,
                    operateVersion,
                    FactoryCode: gs_factoryCode,
                    allocateCode: allocateCode,
                    FromWareHouse: gs_wareCode,
                }),
            });

            if (response.status === 401) {
                Alert.alert("Unauthorized", "Token expired or invalid.");
                return;
            }

            if (response.status === 403) {
                Alert.alert("Access Denied", "You do not have permission.");
                return;
            }

            const result = await response.json();
            if (result.code === 500) {
                setScanState("error");
                Alert.alert("Error", result.message);
                navigation.goBack();
                return;
            }
            if (result.message === "success" && result.data) {
                const data = result.data;
                setToCkName(data.tockName || "");
            } else {
                setScanState("error");
                Alert.alert(
                    "Error",
                    result.message || "Data handling exceptions, please check!"
                );
                navigation.goBack();
            }
        } catch (_) {
            setScanState("error");
            Alert.alert("Error", "Failed to fetch allocate details");
        } finally {
            setLoading(false);
        }
    }, [
        allocateCode,
        gs_factoryCode,
        gs_wareCode,
        BASE_URL,
        token,
        navigation,
        operateUserCode,
        operateUserName,
        operateWareHouseCode,
        operateRandomNumber,
        operateSign,
        operateVersion,
    ]);

    /* ------------------------------------------------------------------ */
    /* Liste des palettes / boîtes déjà allouées                          */
    /* ------------------------------------------------------------------ */
    const fetchAllocateList = useCallback(
        async (code: string) => {
            if (!token) return;
            try {
                const response = await fetch(`${BASE_URL}/api/AllocateList`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        operateUserCode,
                        operateUserName,
                        operateWareHouseCode,
                        operateRandomNumber,
                        operateSign,
                        operateVersion,
                        factoryCode: gs_factoryCode,
                        wareHouseCode: gs_wareCode,
                        FromWareHouse: gs_wareCode,
                        allocateCode: code,
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("AllocateList", result);
                    if (result.message === "success" && result.data) {
                        const newRows = result.data.map((item: any) => ({
                            palletCode: item.palletCode || "—",
                            boxCode: item.boxCode || "—",
                            sn: item.sn || "—",
                            model: item.model || "",
                            color: item.color || "",
                            boxQty:
                                item.boxQty !== undefined ? item.boxQty.toString() : "",
                        }));
                        setTableData(newRows);
                        if (
                            result.data.length > 0 &&
                            result.data[0].totalQty !== undefined
                        ) {
                            setTotalQty(result.data[0].totalQty.toString());
                        }
                    }
                }
            } catch (error: any) {
                Alert.alert("error", error.message);
            }
        },
        [
            token,
            BASE_URL,
            operateUserCode,
            operateUserName,
            operateWareHouseCode,
            operateRandomNumber,
            operateSign,
            operateVersion,
            gs_factoryCode,
            gs_wareCode,
        ]
    );

    // Ne dépend que de token / allocateCode pour ne pas relancer les appels
    // si une valeur du contexte change.
    useEffect(() => {
        if (token) {
            fetchAllocateCheck();
            if (allocateCode) {
                fetchAllocateList(allocateCode);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, allocateCode]);

    /* ------------------------------------------------------------------ */
    /* Insertion                                                          */
    /* Retourne true si l'insertion a réussi                              */
    /* ------------------------------------------------------------------ */
    const processInsert = useCallback(
        async (barCode: string, scanType: string): Promise<boolean> => {
            if (!barCode) return false;

            // Une insertion est déjà en cours
            if (inserting.current) return false;

            // Même insertion déjà faite à l'instant (ex : événement émis deux fois)
            const key = `${barCode}|${scanType}`;
            const now = Date.now();
            if (
                lastInsert.current.key === key &&
                now - lastInsert.current.time < INSERT_DUPLICATE_WINDOW_MS
            ) {
                return false;
            }
            lastInsert.current = { key, time: now };
            inserting.current = true;
            setLoading(true);

            console.log("Entering processInsert with:", barCode, scanType);
            let success = false;
            try {
                const response = await fetch(`${BASE_URL}/api/AllocateInsert`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        operateUserCode,
                        operateUserName,
                        operateWareHouseCode,
                        operateRandomNumber,
                        operateSign,
                        operateVersion,
                        factoryCode: gs_factoryCode,
                        wareHouseCode: gs_wareCode,
                        wareType: gs_wareType,
                        allocateCode: allocateCode,
                        barCode: barCode,
                        scanType: scanType,
                        classesCode: gs_classCode,
                        groupCode: gs_groupCode,
                        workdate: gs_workdate,
                        createUser: gs_userCode,
                    }),
                });

                if (response.status === 401) {
                    Alert.alert("Unauthorized", "Token expired or invalid.");
                    return false;
                }

                if (response.status === 403) {
                    Alert.alert("Access Denied", "You do not have permission.");
                    return false;
                }

                const result = await response.json();
                if (result.code === 500) {
                    Alert.alert("Error", result.message);
                    navigation.goBack();
                    return false;
                }
                console.log("allocateout", result);
                if (result.message === "success" && result.data) {
                    const dataList = result.data;
                    if (dataList.length > 0) {
                        if (dataList[0].isok === "1") {
                            success = true;
                            setScanState("success");
                            const isfinish = dataList[0].isfinish?.toString();

                            if (allocateCode) {
                                fetchAllocateList(allocateCode);
                            }

                            if (isfinish === "1") {
                                Alert.alert(
                                    "Message",
                                    "The allocation of documents has been completed a warehouse!"
                                );
                            } else {
                                console.log("allocateout ok" );
                            }
                        } else {
                            setScanState("error");
                            Alert.alert("Error", dataList[0].retstr || "Unknown error");
                        }
                    }
                } else {
                    setScanState("error");
                    Alert.alert("Error", result.message || "Failed to insert data");
                }
            } catch (_) {
                setScanState("error");
                Alert.alert("Error", "Network error during insertion");
            } finally {
                inserting.current = false;
                // En cas d'échec, on autorise un nouvel essai immédiat
                if (!success) lastInsert.current.time = 0;
                setLoading(false);
                inputRef.current?.focus();
            }
            return success;
        },
        [
            BASE_URL,
            gs_factoryCode,
            gs_wareCode,
            gs_wareType,
            allocateCode,
            gs_classCode,
            gs_groupCode,
            gs_workdate,
            gs_userCode,
            token,
            navigation,
            fetchAllocateList,
            operateUserCode,
            operateUserName,
            operateWareHouseCode,
            operateRandomNumber,
            operateSign,
            operateVersion,
        ]
    );

    /* ------------------------------------------------------------------ */
    /* Retour de l'écran de confirmation (DeviceEventEmitter uniquement)  */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("ON_ALLOCATE_CONFIRM", (data) => {
            console.log("received allocate confirm", data);
            const code = data?.barCode || data?.SN;
            if (!code) return;

            processInsert(code, data.scanType);
        });

        return () => sub.remove();
    }, [processInsert]);

    /* ------------------------------------------------------------------ */
    /* Scan                                                               */
    /* ------------------------------------------------------------------ */
    const handleBarcodeSubmit = async (text?: any) => {
        const raw =
            typeof text === "string" && text.trim() ? text : barcodeRef.current;
        const sn = raw.toUpperCase().trim();

        // On vide toujours l'input, même si le scan est ignoré ensuite,
        // pour que le scan suivant ne soit jamais concaténé à l'ancien.
        barcodeRef.current = "";
        setBarcode("");

        if (!sn) return;
        if (!token) return;
        if (isScanning.current || inserting.current) return;

        // Écran en arrière-plan (confirmation ouverte) : on ignore
        if (!navigation.isFocused()) return;

        // Anti-doublon : même code dans les 2 secondes = ignoré
        const now = Date.now();
        if (
            lastScan.current.code === sn &&
            now - lastScan.current.time < DUPLICATE_WINDOW_MS
        ) {
            return;
        }
        lastScan.current = { code: sn, time: now };

        isScanning.current = true;
        setLoading(true);

        let navigated = false;
        try {
            // 1. Type du code-barres
            const typeResponse = await fetch(`${BASE_URL}/api/BarcodeType`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    operateUserCode,
                    operateUserName,
                    operateWareHouseCode,
                    operateRandomNumber,
                    operateSign,
                    operateVersion,
                    factoryCode: gs_factoryCode,
                    scanCode: sn,
                }),
            });

            if (typeResponse.status === 401) {
                setScanState("error");
                lastScan.current.time = 0;
                Alert.alert("Unauthorized", "Token expired or invalid.");
                return;
            }

            if (typeResponse.status === 403) {
                setScanState("error");
                lastScan.current.time = 0;
                Alert.alert("Access Denied", "You do not have permission.");
                return;
            }
            const typeResult = await typeResponse.json();

            const scanType =
                typeResult?.message === "success" && typeResult?.data?.scanType
                    ? typeResult.data.scanType
                    : "";
            console.log("barcodetype", scanType);

            // 2. Confirmation si nécessaire
            if (scanType === "pallet" || scanType === "box") {
                setScanState("success");
                navigated = true;
                armLockFailsafe();
                navigation.navigate("AllocateSNConfirmBox", {
                    fromWareHouseCode: gs_wareCode,
                    barCode: sn,
                    scanType: scanType,
                });
                return;
            }

            if (scanType === "sn" || scanType === "imei") {
                setScanState("success");
                navigated = true;
                armLockFailsafe();
                navigation.navigate("AllocateSNConfirm", {
                    fromWareHouseCode: gs_wareCode,
                    palletCode: "",
                    boxCode: "",
                    SN: sn,
                    scanType: scanType,
                    showConfirm: true,
                });
                return;
            }

            // 3. Type inconnu : insertion directe (comportement d'origine)
           // const ok = await processInsert(sn, scanType);
           // if (!ok) lastScan.current.time = 0;
        } catch (_) {
            setScanState("error");
            lastScan.current.time = 0;
            Alert.alert("Error", "Failed to process barcode");
        } finally {
            setLoading(false);
            // Si on a navigué, le verrou reste actif jusqu'au retour sur l'écran
            // (libéré par le listener "focus").
            if (!navigated) {
                isScanning.current = false;
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    };

    const handleBarcodeChange = (text: string) => {
        setScanState(text.trim() === "" ? "waiting" : "scanning");

        // Certains scanners ajoutent \n ou \r au lieu de déclencher onSubmitEditing
        if (text.endsWith("\n") || text.endsWith("\r")) {
            handleBarcodeSubmit(text.trim());
            return;
        }

        barcodeRef.current = text;
        setBarcode(text);
    };

    const handleKeyPress = (e: any) => {
        // Certains scanners utilisent la touche Tab comme suffixe
        if (e.nativeEvent.key === "Tab") {
            handleBarcodeSubmit();
        }
    };

    const viewDetails = () => {
        navigation.navigate("AllocateSNBox", { allocateCode });
    };

    /* ------------------------------------------------------------------ */
    /* Rendu                                                              */
    /* ------------------------------------------------------------------ */
    const renderItem = useCallback(
        ({ item, index }: { item: RowType; index: number }) => (
            <View
                key={index}
                style={[
                    styles.tableRow,
                    index % 2 === 0
                        ? { backgroundColor: "#FFFFFF" }
                        : { backgroundColor: "#BAE6FD" },
                ]}
            >
                <Text style={[styles.cell, { width: columns[0].width }]}>
                    {item.palletCode}
                </Text>
                <Text style={[styles.cell, { width: columns[1].width }]}>
                    {item.boxCode}
                </Text>
                <Text style={[styles.cell, { width: columns[2].width }]}>{item.sn}</Text>
                <Text style={[styles.cell, { width: columns[3].width }]}>
                    {item.model}
                </Text>
                <Text style={[styles.cell, { width: columns[4].width, color: factoryColor }]}>
                    {item.color}
                </Text>
                <Text style={[styles.cell, { width: columns[5].width }]}>
                    {item.boxQty}
                </Text>
            </View>
        ),
        []
    );

    const handleReturn = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={[styles.header, { backgroundColor: factoryColor }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleReturn} activeOpacity={0.7}>
                        <Image
                            source={require("../../assets/logo/left.png")}
                            style={styles.returnLogo}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Allocate out Scanning</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.userNameText}>{gs_userName}</Text>
                </View>
            </View>

            <View style={styles.container}>
                <View style={[styles.card, { borderColor: factoryColor }]}>
                    <View style={styles.mb8}>
                        <View style={styles.inputRow}>
                            <Text style={styles.labelNoMargin}>TO WH</Text>
                            <Text style={styles.valueText}>{toCkName}</Text>
                        </View>

                        <View style={styles.inputRow}>
                            <Text style={styles.labelNoMargin}>TOTAL QTY</Text>
                            <Text style={styles.valueText}>{totalQty}</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View
                            style={{
                                borderRadius: 10,
                                borderWidth: scanState === "waiting" ? 1 : 2,
                                borderColor:
                                    scanState === "waiting"
                                        ? factoryColor
                                        : scanState === "scanning"
                                            ? "#f59e0b"
                                            : scanState === "success"
                                                ? "#16a34a"
                                                : "#dc2626",
                                backgroundColor: "#e2f0eeff",
                                elevation: 2,
                            }}
                        >
                            <TextInput
                                ref={inputRef}
                                style={[styles.input, { borderWidth: 0, elevation: 0 }]}
                                value={barcode}
                                onChangeText={handleBarcodeChange}
                                onSubmitEditing={(e) =>
                                    handleBarcodeSubmit(e.nativeEvent.text)
                                }
                                onKeyPress={handleKeyPress}
                                placeholder=" Barcode"
                                placeholderTextColor="#334155"
                                autoFocus={true}
                                showSoftInputOnFocus={showKeyboard}
                                blurOnSubmit={false}
                                onBlur={() => {
                                    if (navigation.isFocused()) ensureFocus();
                                }}
                            />
                        </View>
                    </View>
                </View>

                <View style={[styles.tableCard, { borderColor: factoryColor }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ width: totalTableWidth }}>
                            <View style={[styles.tableHeader, { backgroundColor: factoryColor }]}>
                                {columns.map((col) => (
                                    <Text
                                        key={col.label}
                                        style={[styles.headerCell, { width: col.width }]}
                                    >
                                        {col.label}
                                    </Text>
                                ))}
                            </View>
                            <ScrollView style={styles.flex1}>
                                {tableData.length === 0 ? (
                                    <Text
                                        style={[
                                            styles.emptyTextWithWidth,
                                            { width: totalTableWidth },
                                        ]}
                                    >
                                        No items scanned yet
                                    </Text>
                                ) : (
                                    tableData.map((row, index) => (
                                        <React.Fragment key={row.boxCode + "_" + index}>
                                            {renderItem({ item: row, index })}
                                        </React.Fragment>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: factoryColor }]} onPress={viewDetails}>
                        <Text style={styles.actionButtonText}>Barcode Details</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            )}
        </SafeAreaView>
    );
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 360;
const scale = (size: number) => (width / 375) * size;

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        backgroundColor: "#0052cc",
        paddingHorizontal: width * 0.05,
        height: scale(56),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 4,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    returnLogo: {
        width: scale(24),
        height: scale(24),
        marginRight: 10,
        tintColor: "#FFFFFF",
    },
    headerTitle: {
        color: "#FFFFFF",
        fontSize: isSmallDevice ? scale(14) : scale(16),
        fontWeight: "900",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    userNameText: {
        color: "#FFFFFF",
        fontSize: scale(12),
        fontWeight: "700",
        marginRight: 1,
    },
    container: { flex: 1, padding: 10 },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 10,
        marginBottom: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#0052cc",
    },
    inputGroup: { marginBottom: 1 },
    input: {
        backgroundColor: "#e2f0eeff",
        padding: 3,
        borderRadius: 10,
        fontWeight: "600",
        fontSize: 15,
        color: "#334155",
        borderWidth: 1,
        borderColor: "#0052cc",
        height: 35,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0052cc",
        paddingVertical: 10,
    },
    headerCell: {
        fontSize: 11,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    cell: {
        fontSize: 11,
        color: "#334155",
        textAlign: "center",
        fontWeight: "600",
    },
    actions: { flexDirection: "row", gap: 12, marginTop: 8 },
    actionButton: {
        flex: 1,
        backgroundColor: "#4F46E5",
        padding: 8,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    actionButtonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.7)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    mb8: { marginBottom: 8 },
    inputRow: {
        backgroundColor: "#0052cc",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        height: 35,
    },
    labelNoMargin: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 0,
        textTransform: "uppercase",
    },
    valueText: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
    tableCard: {
        flex: 1,
        backgroundColor: "#FFF",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        borderWidth: 1,
        borderColor: "#0052cc",
        marginBottom: 12,
    },
    flex1: { flex: 1 },
    emptyTextWithWidth: {
        textAlign: "center",
        color: "#94A3B8",
        marginTop: 40,
        fontStyle: "italic",
        width: 400,
    },
});