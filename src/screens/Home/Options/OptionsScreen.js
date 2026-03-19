import React, { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { RoundedContainer, SafeAreaView } from '@components/containers';
import { ListItem } from '@components/Options';
import { formatData } from '@utils/formatters';
import { EmptyItem } from '@components/common/empty';
import { COLORS } from '@constants/theme';
import { useLoader, useTranslation } from '@hooks';
import { fetchProductDetailsByBarcode } from '@api/details/detailApi';
import { showToastMessage } from '@components/Toast';
import { OverlayLoader } from '@components/Loader';
import { ConfirmationModal } from '@components/Modal';
import { useAuthStore } from '@stores/auth';
import { post } from '@api/services/utils';

const OptionsScreen = ({ navigation }) => {
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [loading, startLoading, stopLoading] = useLoader(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  const { t } = useTranslation();

  const handleScan = async (code) => {
    startLoading();
    try {
      const productDetails = await fetchProductDetailsByBarcode(code);
      if (productDetails.length > 0) {
        const details = productDetails[0];
        navigation.navigate('ProductDetail', { detail: details });
      } else {
        showToastMessage(t.noProductsForBarcode);
      }
    } catch (error) {
      showToastMessage(`Error fetching inventory details ${error.message}`);
    } finally {
      stopLoading();
    }
  };

  const options = [
    { title: t.searchProducts, image: require('@assets/images/Home/options/search_product.png'), onPress: () => navigation.navigate('Products') },
    { title: t.scanBarcode, image: require('@assets/images/Home/options/scan_barcode.png'), onPress: () => navigation.navigate("Scanner", { onScan: handleScan }) },
    { title: t.productEnquiry, image: require('@assets/images/Home/options/product_enquiry.png'), onPress: () => navigation.navigate('PriceEnquiryScreen') },
    { title: t.transactionAuditing, image: require('@assets/images/Home/options/transaction_auditing.png'), onPress: () => navigation.navigate('AuditScreen') },
    { title: t.crm, image: require('@assets/images/Home/options/crm.png'), onPress: () => navigation.navigate('CRM') },
    { title: t.purchases, image: require('@assets/images/Home/options/product_purchase_requisition.png'), onPress: () => navigation.navigate('PurchasesScreen') },
    { title: t.vehicleTracking, image: require('@assets/images/Home/options/customer_visit.png'), onPress: () => navigation.navigate('VehicleTrackingScreen') },
    { title: t.taskManager, image: require('@assets/images/Home/options/tasK_manager_1.png'), onPress: () => navigation.navigate('TaskManagerScreen') },
    { title: t.visitsPlan, image: require('@assets/images/Home/options/visits_plan.png'), onPress: () => navigation.navigate('VisitsPlanScreen') },
    { title: t.customerVisits, image: require('@assets/images/Home/options/customer_visit.png'), onPress: () => navigation.navigate('VisitScreen') },
    { title: t.marketStudy, image: require('@assets/images/Home/options/market_study_1.png'), onPress: () => navigation.navigate('MarketStudyScreen') },
    { title: t.attendance, image: require('@assets/images/Home/options/attendance.png'), onPress: () => navigation.navigate('AttendanceScreen') },
    { title: t.inventoryManagement, image: require('@assets/images/Home/options/inventory_management_1.png'), onPress: () => navigation.navigate('InventoryScreen') },
    { title: t.boxInspection, image: require('@assets/images/Home/options/box_inspection.png'), onPress: () => setIsConfirmationModalVisible(true) },
    { title: t.deviceRegistry, image: require('@assets/images/Home/options/scan_barcode.png'), onPress: () => navigation.navigate('DeviceRegistry') },
  ];

  const renderItem = ({ item }) => {
    if (item.empty) {
      return <EmptyItem />;
    }
    return <ListItem title={item.title} image={item.image} onPress={item.onPress} />;
  };

  const handleBoxInspectionStart = async () => {
    setIsLoading(true);
    try {
      const boxInspectionGroupingData = {
        start_date_time: new Date(),
        sales_person_id: currentUser.related_profile?._id || null,
        warehouse_id: currentUser.warehouse?.warehouse_id || null,
      };
      const response = await post('/createBoxInspectionGrouping', boxInspectionGroupingData);
      if (response.success) {
        navigation.navigate('BoxInspectionScreen', { groupId: response?.data?._id })
      }
    } catch (error) {
      console.log('API Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView backgroundColor={COLORS.white}>
      <NavigationHeader
        title={t.options}
        color={COLORS.black}
        backgroundColor={COLORS.white}
        onBackPress={() => navigation.goBack()}
      />
      <RoundedContainer backgroundColor={COLORS.primaryThemeColor}>
        <FlatList
          data={formatData(options, 2)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          renderItem={renderItem}
          numColumns={2}
          keyExtractor={(item, index) => index.toString()}
        />
        <OverlayLoader visible={loading || isLoading} />
      </RoundedContainer>

      <ConfirmationModal
        onCancel={() => setIsConfirmationModalVisible(false)}
        isVisible={isConfirmationModalVisible}
        onConfirm={() => {
          handleBoxInspectionStart();
          setIsConfirmationModalVisible(false);
        }}
        headerMessage={t.boxInspectionConfirm}
      />
    </SafeAreaView>
  );
};

export default OptionsScreen;
