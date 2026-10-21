import React from "react";
import { GlobalProvider } from "./GlobalContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Login from "./src/Login";
import SplashScreen from "./src/SplashScreen";
import Menu from "./src/Menu";
//InWharHouse
import InWarehouse from "./src/InWarehouse/InWarehouse";
import InWarehouseConfirmBox from "./src/InWarehouse/InWarehouseConfirmBox";
import InWarehouseSNBox from "./src/InWarehouse/InWarehouseSNBox";
import InWarehouseSNConfirm from "./src/InWarehouse/InWarehouseSNConfirm";
import InWarehouseSN from "./src/InWarehouse/InWarehouseSN";

//DeliverySAP
import DeliverySAP from "./src/Delivery/DeliverySAP";
import DeliveryFrm from "./src/Delivery/DeliveryFrm";
import DeliverySNConfirmBox from "./src/Delivery/DeliverySNConfirmBox";
import DeliverySNConfirm from "./src/Delivery/DeliverySNConfirm";
import DeliverySNBox from "./src/Delivery/DeliverySNBox";
import DeliverySN from "./src/Delivery/DeliverySN";

//AllocateoutSAP
import AllocateSAP from "./src/Allocateout/AllocateSAP";
import AllocateFrm from "./src/Allocateout/AllocateFrm";
import AllocateSNConfirmBox from "./src/Allocateout/AllocateSNConfirmBox";
import AllocateSNConfirm from "./src/Allocateout/AllocateSNConfirm";
import AllocateSNBox from "./src/Allocateout/AllocateSNBox";
import AllocateSN from "./src/Allocateout/AllocateSN";

//AllocateIn
import AllocateInNO from "./src/AllocateIN/AllocateInNo";
import AllocateInFrm from "./src/AllocateIN/AllocateInFrm";
import AllocateInSNConfirmBox from "./src/AllocateIN/AllocateInSNConfirmBox";
import AllocateInSNConfirm from "./src/AllocateIN/AllocateInSNConfirm";
import AllocateInSNBox from "./src/AllocateIN/AllocateInSNBox";
import AllocateInSN from "./src/AllocateIN/AllocateInSN";

//AllocateRejectIn
import AllocateRejectIn from "./src/AllocateRejectIn/AllocateRejectIn";
import AllocateRejectInSNConfirmBox from "./src/AllocateRejectIn/AllocateRejectInSNConfirmBox";
import AllocateRejectInSNConfirm from "./src/AllocateRejectIn/AllocateRejectInSNConfirm";

//PalletSearch
import PalletSearch from "./src/PalletSearch/PalletSearch";
import PalletSNDetails from "./src/PalletSearch/PalletSNDetails";


//PalletnotIn
import PalletNotIn from "./src/PalletNotIn/PalletNotIn";
import PalletNotInBox from "./src/PalletNotIn/PalletNotInBox";
import PalletNotInSN from "./src/PalletNotIn/PalletNotInSN";

//Inventory
import PD from "./src/Inventory/PD";


//DeliveryReturn
import DeliveryReturnNo from "./src/DeliveryReturn/DeliveryReturnNo";
import DeliveryReturn from "./src/DeliveryReturn/DeliveryReturn";
import DeliveryReturnSNConfirmBox from "./src/DeliveryReturn/DeliveryReturnSNConfirmBox";
import DeliveryReturnSNConfirm from "./src/DeliveryReturn/DeliveryReturnSNConfirm";
import DeliveryReturnSNBox from "./src/DeliveryReturn/DeliveryReturnSNBox";
import DeliveryReturnSN from "./src/DeliveryReturn/DeliveryReturnSN";


//AssemblyDisassembly
import Assembly from "./src/AssemblyDisassembly/Assembly";
import Disassembly from "./src/AssemblyDisassembly/Disassembly";
import ModelSelect from "./src/AssemblyDisassembly/ModelSelect";

//DistributorReturn
import DistributorReturnNo from "./src/DistributorReturn/DistributorReturnNo";
import DistributorReturn from "./src/DistributorReturn/DistributorReturn";
import DistributorReturnSNConfirm from "./src/DistributorReturn/DistributorReturnSNConfirm";
import DistributorReturnSN from "./src/DistributorReturn/DistributorReturnSN";

//SNReturn

import SNReturn from "./src/SNReturn/SNReturn";






const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GlobalProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="SplashScreen"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Menu" component={Menu} />



          <Stack.Screen name="InWarehouse" component={InWarehouse} />
          <Stack.Screen name="InWarehouseConfirmBox" component={InWarehouseConfirmBox} />
          <Stack.Screen name="InWarehouseSNBox" component={InWarehouseSNBox} />
          <Stack.Screen name="InWarehouseSNConfirm" component={InWarehouseSNConfirm} />
          <Stack.Screen name="InWarehouseSN" component={InWarehouseSN} />


          <Stack.Screen name="DeliverySAP" component={DeliverySAP} />
          <Stack.Screen name="DeliveryFrm" component={DeliveryFrm} />
          <Stack.Screen name="DeliverySNConfirmBox" component={DeliverySNConfirmBox} />
          <Stack.Screen name="DeliverySNConfirm" component={DeliverySNConfirm} />
          <Stack.Screen name="DeliverySNBox" component={DeliverySNBox} />
          <Stack.Screen name="DeliverySN" component={DeliverySN} />

          <Stack.Screen name="AllocateSAP" component={AllocateSAP} />
          <Stack.Screen name="AllocateFrm" component={AllocateFrm} />
          <Stack.Screen name="AllocateSNConfirmBox" component={AllocateSNConfirmBox} />
          <Stack.Screen name="AllocateSNConfirm" component={AllocateSNConfirm} />
          <Stack.Screen name="AllocateSNBox" component={AllocateSNBox} />
          <Stack.Screen name="AllocateSN" component={AllocateSN} />

          <Stack.Screen name="AllocateInNO" component={AllocateInNO} />
          <Stack.Screen name="AllocateInFrm" component={AllocateInFrm} />
          <Stack.Screen name="AllocateInSNConfirmBox" component={AllocateInSNConfirmBox} />
          <Stack.Screen name="AllocateInSNConfirm" component={AllocateInSNConfirm} />
          <Stack.Screen name="AllocateInSNBox" component={AllocateInSNBox} />
          <Stack.Screen name="AllocateInSN" component={AllocateInSN} />

          <Stack.Screen name="AllocateRejectIn" component={AllocateRejectIn} />
          <Stack.Screen name="AllocateRejectInSNConfirmBox" component={AllocateRejectInSNConfirmBox} />
          <Stack.Screen name="AllocateRejectInSNConfirm" component={AllocateRejectInSNConfirm} />

          <Stack.Screen name="PalletSearch" component={PalletSearch} />
          <Stack.Screen name="PalletSNDetails" component={PalletSNDetails} />

          <Stack.Screen name="PalletNotIn" component={PalletNotIn} />
          <Stack.Screen name="PalletNotInBox" component={PalletNotInBox} />
          <Stack.Screen name="PalletNotInSN" component={PalletNotInSN} />

          <Stack.Screen name="PD" component={PD} />

          <Stack.Screen name="DeliveryReturnNo" component={DeliveryReturnNo} />
          <Stack.Screen name="DeliveryReturn" component={DeliveryReturn} />
          <Stack.Screen name="DeliveryReturnSNConfirmBox" component={DeliveryReturnSNConfirmBox} />
          <Stack.Screen name="DeliveryReturnSNConfirm" component={DeliveryReturnSNConfirm} />
          <Stack.Screen name="DeliveryReturnSNBox" component={DeliveryReturnSNBox} />
          <Stack.Screen name="DeliveryReturnSN" component={DeliveryReturnSN} />


          <Stack.Screen name="Assembly" component={Assembly} />
          <Stack.Screen name="Disassembly" component={Disassembly} />
          <Stack.Screen name="ModelSelect" component={ModelSelect} />


          <Stack.Screen name="DistributorReturnNo" component={DistributorReturnNo} />
          <Stack.Screen name="DistributorReturn" component={DistributorReturn} />
          <Stack.Screen name="DistributorReturnSNConfirm" component={DistributorReturnSNConfirm} />
          <Stack.Screen name="DistributorReturnSN" component={DistributorReturnSN} />

          <Stack.Screen name="SNReturn" component={SNReturn} />



        </Stack.Navigator>
      </NavigationContainer>
    </GlobalProvider>
  );
}
