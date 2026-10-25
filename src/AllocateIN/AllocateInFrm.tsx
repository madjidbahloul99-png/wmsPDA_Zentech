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
    Image,
    Dimensions,
    DeviceEventEmitter,
} from "react-native";
import { useGlobal } from "../../GlobalContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Même code scanné dans cet intervalle = ignoré
const DUPLICATE_WINDOW_MS = 2000;
// Délai d'auto-validation quand le scanner n'envoie pas de Enter
const AUTO_SUBMIT_DELAY_MS = 800;

type RowType = {
    boxCode: string;
    model: string;
    color: string;
    boxQty: string;
};

export default function AllocateInFrm({ navigation, route }: any) {
    const { allocateCode } = route.params || { allocateCode: "" };

    const global = useGlobal();
    const {
        gsURL,
        gs_factoryCode,
        gs_wareCode,
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
    const [token, setToken] = useState("");

    const [sn, setSn] = useState("");
    const [toCk, setToCk] = useState("");
    const [totalQty, setTotalQty] = useState("0");
    const [rows, setRows] = useState<RowType[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showKeyboard] = useState(false);

    const snRef = useRef<TextInput>(null);
    const isScanning = useRef(false);
    const dealing = useRef(false);
    const scanTimer = useRef<any>(null);
    const lastScan = useRef<{ code: string; time: number }>({ code: "", time: 0 });

    /* ------------------------------------------------------------------ */
    /* Focus                                                              */
    /* ------------------------------------------------------------------ */
    const ensureFocus = () => {
        if (snRef.current) {
            snRef.current.focus();
        }
    };

    // Libère le verrou et redonne le focus uniquement au retour sur l'écran
    useEffect(() => {
        const unsub = navigation.addListener("focus", () => {
            isScanning.current = false;
            setTimeout(() => snRef.current?.focus(), 100);
        });
        return () => {
            unsub();
            clearTimeout(scanTimer.current);
        };
    }, [navigation]);

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
    const checkAllocate = useCallback(async () => {
        if (!allocateCode) return;
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/AllocateInCheck`, {
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
                    allocateCode: allocateCode,
                    toWareHouse: gs_wareCode,
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
                Alert.alert("Error", result.message);
                navigation.goBack();
                return;
            }
            console.log("resultat de allocatin", result);
            if (result?.message === "success" && result?.data) {
                const row = Array.isArray(result.data)
                    ? result.data[0]
                    : result.data;

                if (result?.message === "success" ) {
                    setToCk(row.fromckName || "");
                } else {
                    Alert.alert("Error1", row.retstr || "Check failed");
                    navigation.goBack();
                }
            } else {
                Alert.alert("Error", "Data handling exceptions, please check!");
            }
        } catch (err: any) {
            Alert.alert("Error", err.message);
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

    useEffect(() => {
        if (token) {
            checkAllocate();
            snRef.current?.focus();
        }
    }, [checkAllocate, token]);

    /* ------------------------------------------------------------------ */
    /* Type de code-barres                                                */
    /* Retourne : string ("" si inconnu) ou null en cas d'erreur d'auth   */
    /* ------------------------------------------------------------------ */
    const getType = async (barcode: string): Promise<string | null> => {
        try {
            const response = await fetch(`${BASE_URL}/api/BarcodeType`, {
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
                    scanCode: barcode,
                }),
            });

            if (response.status === 401) {
                Alert.alert("Unauthorized", "Token expired or invalid.");
                return null;
            }

            if (response.status === 403) {
                Alert.alert("Access Denied", "You do not have permission.");
                return null;
            }

            const result = await response.json();

            console.log("response de type de scan", result);

            if (result.code === 500) {
                Alert.alert("Error", result.message);
                navigation.goBack();
                return null;
            }
            if (result.message === "success") {
                return result.data?.scanType ?? "";
            }
            return "";
        } catch (err) {
            return "";
        }
    };

    /* ------------------------------------------------------------------ */
    /* Insertion (appelée après confirmation sur l'écran de confirmation) */
    /* ------------------------------------------------------------------ */
    const palletDeal = useCallback(
        async (barcode: string, scanType: string) => {
            // Garde anti double insertion
            if (dealing.current) return;
            dealing.current = true;

            console.log("palletDeal called with:", barcode, scanType);
            setLoading(true);
            setErrorMsg("");
            try {
                const response = await fetch(`${BASE_URL}/api/AllocateInInsert`, {
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
                        allocateCode: allocateCode,
                        barCode: barcode,
                        scanType: scanType,
                        classesCode: gs_classCode,
                        groupCode: gs_groupCode,
                        workdate: gs_workdate,
                        createUser: gs_userCode,
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
                    Alert.alert("Error", result.message);
                    navigation.goBack();
                    return;
                }
                console.log("resultat de allocationfrm", result);
                if (result.message === "success" && result.data) {
                    const firstRow = result.data[0];
                    if (firstRow.isok === "1") {
                        setTotalQty(firstRow.totalQty || "0");
                        const newRows = result.data.map((r: any) => ({
                            boxCode: r.boxCode,
                            model: r.model,
                            color: r.color,
                            boxQty: r.boxQty,
                        }));
                        setRows(newRows);
                        if (firstRow.isfinish === "1") {
                            Alert.alert(
                                "Message",
                                "The allocation of documents has been completed a warehouse!"
                            );
                        }
                    } else {
                        setErrorMsg(firstRow.retstr);
                    }
                } else {
                    setErrorMsg("There is no product in the Pallet!");
                }
            } catch (err: any) {
                setErrorMsg(err.message);
            } finally {
                dealing.current = false;
                setLoading(false);
            }
        },
        [
            BASE_URL,
            gs_factoryCode,
            gs_wareCode,
            allocateCode,
            gs_classCode,
            gs_groupCode,
            gs_workdate,
            gs_userCode,
            token,
            navigation,
            operateUserCode,
            operateUserName,
            operateWareHouseCode,
            operateRandomNumber,
            operateSign,
            operateVersion,
        ]
    );

    /* ------------------------------------------------------------------ */
    /* Écoute de la confirmation                                          */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(
            "ALLOCATE_IN_SN_CONFIRM",
            async (data) => {
                const code = data?.barCode || data?.SN;
                if (!code) return;

                await palletDeal(code, data.scanType);
                setSn("");
                snRef.current?.focus();
            }
        );

        return () => sub.remove();
    }, [palletDeal]);

    /* ------------------------------------------------------------------ */
    /* Scan                                                               */
    /* ------------------------------------------------------------------ */
    const handleScan = async (text?: string) => {
        if (isScanning.current || dealing.current) return;

        // Si l'écran n'est pas au premier plan, on ignore (input caché)
        if (!navigation.isFocused()) return;

        const barcode = (text || sn).toUpperCase().trim();
        if (!barcode) return;

        // Anti-doublon : même code dans les 2 secondes = ignoré
        const now = Date.now();
        if (
            lastScan.current.code === barcode &&
            now - lastScan.current.time < DUPLICATE_WINDOW_MS
        ) {
            return;
        }
        lastScan.current = { code: barcode, time: now };

        clearTimeout(scanTimer.current);
        isScanning.current = true;
        setSn(""); // vider tout de suite, pour tous les types de code
        setErrorMsg("");
        setLoading(true);

        let navigated = false;
        try {
            let scanType = await getType(barcode);
            setLoading(false);

            // Erreur d'authentification / serveur : on autorise un nouvel essai
            if (scanType === null) {
                lastScan.current.time = 0;
                return;
            }
              /// new condition : if scanType is empty
            if (scanType === "") scanType = "sn";
            console.log("resultat de type de scan", scanType);

            if (scanType === "pallet" || scanType === "box") {
                navigated = true;
                navigation.navigate("AllocateInSNConfirmBox", {
                    allocateCode,
                    barCode: barcode,
                    scanType,
                });
            } else if (scanType === "sn" || scanType === "imei") {
                navigated = true;
                navigation.navigate("AllocateInSNConfirm", {
                    allocateCode,
                    palletCode: "",
                    boxCode: "",
                    SN: barcode,
                    scanType,
                    showConfirm: true,
                });
            } else {
                lastScan.current.time = 0;
            }
        } catch (err: any) {
            lastScan.current.time = 0;
            Alert.alert("Error", err.message);
            setLoading(false);
        } finally {
            // Si on a navigué, le verrou reste actif jusqu'au retour sur l'écran
            // (il est libéré par le listener "focus").
            if (!navigated) {
                isScanning.current = false;
                setTimeout(() => snRef.current?.focus(), 100);
            }
        }
    };

    const handleSnChange = (text: string) => {
        if (text.endsWith("\n") || text.endsWith("\r")) {
            const cleanSn = text.toUpperCase().trim();
            if (cleanSn.length > 0) {
                clearTimeout(scanTimer.current);
                handleScan(cleanSn);
            }
            return;
        }

        setSn(text);

        clearTimeout(scanTimer.current);

        if (text.trim().length > 0) {
            scanTimer.current = setTimeout(() => {
                const cleanSn = text.toUpperCase().trim();
                if (cleanSn.length > 0) {
                    handleScan(cleanSn);
                }
            }, AUTO_SUBMIT_DELAY_MS);
        }
    };

    const handleSnSubmitInternal = (e: any) => {
        const text = e.nativeEvent.text;
        const cleanSn = text.toUpperCase().trim();
        if (cleanSn.length > 0) {
            clearTimeout(scanTimer.current);
            handleScan(cleanSn);
        }
    };

    /* ------------------------------------------------------------------ */
    /* Rendu                                                              */
    /* ------------------------------------------------------------------ */
    const renderItem = ({ item, index }: { item: RowType; index: number }) => (
        <View
            key={index}
            style={[
                styles.row,
                index % 2 === 0
                    ? { backgroundColor: "#FFFFFF" }
                    : { backgroundColor: "#BAE6FD" },
            ]}
        >
            <Text style={[styles.cell, { width: 120 }]}>{item.boxCode}</Text>
            <Text style={[styles.cell, { width: 120 }]}>{item.model}</Text>
            <Text style={[styles.cell, { width: 100 }]}>{item.color}</Text>
            <Text style={[styles.cell, { width: 60 }]}>{item.boxQty}</Text>
        </View>
    );

    const handleReturn = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleReturn} activeOpacity={0.7}>
                        <Image
                            source={require("../../assets/logo/left.png")}
                            style={styles.returnLogo}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Allocate Into Warehouse</Text>
                </View>

                <View style={styles.headerRight}>
                    <Text style={styles.userNameText}>{gs_userName}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={{ marginBottom: 8 }}>
                        <View
                            style={[
                                styles.input,
                                {
                                    backgroundColor: "#0052cc",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                    marginBottom: 4,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.label,
                                    { marginBottom: 0, fontSize: 13, color: "#FFF" },
                                ]}
                            >
                                TO
                            </Text>
                            <Text
                                style={{ fontSize: 13, color: "#FFF", fontWeight: "700" }}
                            >
                                {toCk}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.input,
                                {
                                    backgroundColor: "#0052cc",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingHorizontal: 12,
                                    paddingVertical: 4,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.label,
                                    { marginBottom: 0, fontSize: 13, color: "#FFF" },
                                ]}
                            >
                                QTY
                            </Text>
                            <Text
                                style={{ fontSize: 13, color: "#FFF", fontWeight: "700" }}
                            >
                                {totalQty}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <TextInput
                            ref={snRef}
                            style={styles.input}
                            value={sn}
                            onChangeText={handleSnChange}
                            onSubmitEditing={handleSnSubmitInternal}
                            placeholder="Barcode"
                            placeholderTextColor="#334155"
                            autoCapitalize="characters"
                            showSoftInputOnFocus={showKeyboard}
                            blurOnSubmit={false}
                            onBlur={() => {
                                if (navigation.isFocused()) ensureFocus();
                            }}
                        />
                    </View>
                    {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                </View>

                <View style={styles.tableCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ minWidth: width }}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerCell, { width: 120 }]}>
                                    Box Code
                                </Text>
                                <Text style={[styles.headerCell, { width: 120 }]}>Model</Text>
                                <Text style={[styles.headerCell, { width: 100 }]}>Color</Text>
                                <Text style={[styles.headerCell, { width: 60 }]}>Qty</Text>
                            </View>
                            <ScrollView style={{ flex: 1 }}>
                                {rows.length === 0 ? (
                                    <Text style={[styles.emptyText, { width: 400 }]}>
                                        No items scanned yet
                                    </Text>
                                ) : (
                                    rows.map((item, index) => (
                                        <React.Fragment key={item.boxCode + "_" + index}>
                                            {renderItem({ item, index })}
                                        </React.Fragment>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.detailButton}
                        onPress={() =>
                            navigation.navigate("AllocateInSNBox", { allocateCode })
                        }
                    >
                        <Text style={styles.detailButtonText}>Barcode Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 360;
const scale = (size: number) => (width / 375) * size;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
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
    content: { flex: 1, padding: 16 },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 10,
        marginBottom: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#0052cc",
    },
    tableCard: {
        flex: 1,
        backgroundColor: "#FFF",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 12,
    },
    inputGroup: { marginTop: 6, marginBottom: 4 },
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748B",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    input: {
        backgroundColor: "#e2f0eeff",
        padding: 3,
        paddingLeft: 8,
        borderRadius: 10,
        fontSize: 15,
        color: "#1E293B",
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
        fontSize: 12,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        textTransform: "uppercase",
    },
    row: {
        flexDirection: "row",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    cell: {
        fontSize: 11,
        color: "#334155",
        textAlign: "center",
        fontWeight: "600",
    },
    emptyText: {
        textAlign: "center",
        color: "#94A3B8",
        marginTop: 40,
        fontStyle: "italic",
    },
    footer: { flexDirection: "row", gap: 12 },
    detailButton: {
        flex: 1,
        backgroundColor: "#4F46E5",
        padding: 8,
        borderRadius: 12,
        alignItems: "center",
    },
    detailButtonText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
    errorText: { color: "#EF4444", fontSize: 12, marginTop: 8, fontWeight: "700" },
});