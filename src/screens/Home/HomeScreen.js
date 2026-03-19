import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CarouselPagination,
  ImageContainer,
  ListHeader,
  Header,
} from "@components/Home";
import { fetchCategoriesOdoo as fetchCategories, fetchProductsByPosCategoryId, clearProductCache } from "@api/services/generalApi";
import { RoundedContainer, SafeAreaView } from "@components/containers";
import { formatData } from "@utils/formatters";
import { COLORS } from "@constants/theme";
import { showToastMessage } from "@components/Toast";
import { CategoryList } from "@components/Categories";
<<<<<<< HEAD
import { useDataFetching, useLoader, useTranslation } from "@hooks";
=======
import { useDataFetching, useLoader } from "@hooks";
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { fetchProductDetailsByBarcode } from "@api/details/detailApi";
import { OverlayLoader } from "@components/Loader";

const HomeScreen = ({ navigation }) => {
  const [backPressCount, setBackPressCount] = useState(0);
  const isFocused = useIsFocused();
  const { data, loading, fetchData, fetchMoreData } =
    useDataFetching(fetchCategories);
<<<<<<< HEAD
  const { t, isRTL } = useTranslation();
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

  const handleBackPress = useCallback(() => {
    if (navigation.isFocused()) {
      if (backPressCount === 0) {
        setBackPressCount(1);
        return true;
      } else if (backPressCount === 1) {
        BackHandler.exitApp();
      }
    }
    return false;
  }, [backPressCount, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  useEffect(() => {
    const backPressTimer = setTimeout(() => {
      setBackPressCount(0);
    }, 2000);
    return () => clearTimeout(backPressTimer);
  }, [backPressCount]);

  useEffect(() => {
    if (backPressCount === 1) {
<<<<<<< HEAD
      showToastMessage(t.pressBackToExit);
=======
      showToastMessage("Press back again to exit");
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    }
  }, [backPressCount]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const filteredCategories = Array.isArray(data) ? data : [];

  const handleLoadMore = () => {
    fetchMoreData();
  };

  const renderItem = ({ item }) => {
    if (item.empty) {
      return <View style={[styles.itemStyle, styles.itemInvisible]} />;
    }
    return (
      <CategoryList
        item={item}
        onPress={() => {
          navigation.navigate("Products", {
            categoryId: item._id,
            categoryName: item.category_name || item.name,
            filteredProducts: []
          });
        }}
      />
    );
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  const [detailLoading, startLoading, stopLoading] = useLoader(false);

  const handleScan = async (code) => {
    startLoading();
    try {
      const productDetails = await fetchProductDetailsByBarcode(code);
      if (productDetails.length > 0) {
        const details = productDetails[0];
        navigation.navigate('ProductDetail', { detail: details });
      } else {
<<<<<<< HEAD
        showToastMessage(t.noProductsForBarcode);
=======
        showToastMessage("No Products found for this Barcode");
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
      }
    } catch (error) {
      showToastMessage(`Error fetching inventory details ${error.message}`);
    } finally {
      stopLoading();
    }
  };

<<<<<<< HEAD
  const rtlRowStyle = isRTL ? { flexDirection: 'row-reverse' } : {};
  const rtlTextStyle = isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {};

=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  return (
    <SafeAreaView backgroundColor={COLORS.primaryThemeColor}>
      <RoundedContainer>
        {/* Header - centered logo */}
        <View style={styles.headerRow}>
          <Header />
        </View>
        {/* Carousel */}
        <CarouselPagination />

        {/* Take Orders button */}
        <TouchableOpacity
          onPress={() => navigateToScreen("POSRegister")}
<<<<<<< HEAD
          style={[styles.takeOrderBtn, rtlRowStyle]}
          activeOpacity={0.85}
        >
          <View style={[styles.takeOrderIconWrap, isRTL ? { marginLeft: 14, marginRight: 0 } : {}]}>
            <Image source={require('@assets/images/logo/logo.png')} style={styles.takeOrderIcon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.takeOrderTitle, rtlTextStyle]}>{t.takeOrders}</Text>
            <Text style={[styles.takeOrderSub, rtlTextStyle]}>{t.dineInTakeaway}</Text>
          </View>
          <Text style={styles.takeOrderArrow}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>

        {/* Our Specials header */}
        <ListHeader title={t.ourSpecials} subtitle={t.chefsPicksForToday} />
=======
          style={styles.takeOrderBtn}
          activeOpacity={0.85}
        >
          <View style={styles.takeOrderIconWrap}>
            <Image source={require('@assets/images/logo/logo.png')} style={styles.takeOrderIcon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.takeOrderTitle}>Take Orders</Text>
            <Text style={styles.takeOrderSub}>Dine-in, Takeaway & more</Text>
          </View>
          <Text style={styles.takeOrderArrow}>›</Text>
        </TouchableOpacity>

        {/* Our Specials header */}
        <ListHeader title="Our Specials" subtitle="Chef's picks for today" />
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

        {/* 3-column category grid */}
        <FlatList
          data={formatData(filteredCategories, 3)}
          numColumns={3}
          style={styles.list}
          initialNumToRender={6}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
<<<<<<< HEAD
                <Text style={styles.emptyText}>{t.noSpecialsAvailable}</Text>
=======
                <Text style={styles.emptyText}>No specials available</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? <ActivityIndicator size="large" color={COLORS.primaryThemeColor} style={{ marginVertical: 16 }} /> : null
          }
        />

        <OverlayLoader visible={detailLoading} />
      </RoundedContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
    paddingTop: 4,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
  itemStyle: {
    flex: 1,
    alignItems: "center",
    margin: 5,
    borderRadius: 14,
    marginTop: 5,
    backgroundColor: "white",
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  takeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F47B20',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#F47B20', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 8 },
    }),
  },
  takeOrderIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  takeOrderIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  takeOrderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  takeOrderSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  takeOrderArrow: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
  },
});

export default HomeScreen;
