import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import {
  CarouselPagination,
  ImageContainer,
  ListHeader,
  Header,
} from "@components/Home";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { fetchCategoriesOdoo as fetchCategories, fetchProductsByPosCategoryId } from "@api/services/generalApi";
import { RoundedContainer, SafeAreaView } from "@components/containers";
import { formatData } from "@utils/formatters";
import { COLORS } from "@constants/theme";
import { showToastMessage } from "@components/Toast";
import { CategoryList } from "@components/Categories";
import { useDataFetching, useLoader } from "@hooks";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { fetchProductDetailsByBarcode } from "@api/details/detailApi";
import { OverlayLoader } from "@components/Loader";

const { height } = Dimensions.get("window");

const HomeScreen = ({ navigation }) => {
  const [backPressCount, setBackPressCount] = useState(0);
  const isFocused = useIsFocused();
  const { data, loading, fetchData, fetchMoreData } =
    useDataFetching(fetchCategories);

  const handleBackPress = useCallback(() => {
    if (navigation.isFocused()) {
      if (backPressCount === 0) {
        setBackPressCount(1);
        return true;
      } else if (backPressCount === 1) {
        BackHandler.exitApp();
      }
    }
    return false; // Allow default back action
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
    // Show toast message when backPressCount changes to 1
    if (backPressCount === 1) {
      showToastMessage("Press back again to exit");
    }
  }, [backPressCount]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  // Filter out categories named 'Food' or 'Drinks' and dedupe by name keeping last occurrence
  const filteredCategories = (() => {
    const raw = Array.isArray(data) ? data : [];
    const excludeNames = ['food', 'drinks'];
    const filtered = raw.filter(item => {
      const name = item && (item.category_name || item.name || (Array.isArray(item) ? item[1] : ''));
      if (!name) return true;
      const lower = String(name).toLowerCase();
      return !(excludeNames.includes(lower) || excludeNames.some(e => lower.includes(e)));
    });
    // Deduplicate by name, keeping the last occurrence
    const seen = new Set();
    const outReversed = [];
    for (let i = filtered.length - 1; i >= 0; i--) {
      const item = filtered[i];
      const name = item && (item.category_name || item.name || (Array.isArray(item) ? item[1] : ''));
      const key = name ? String(name).trim().toLowerCase() : `__idx_${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        outReversed.push(item);
      }
    }
    return outReversed.reverse();
  })();

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
        onPress={async () => {
          try {
            const products = await fetchProductsByPosCategoryId(item._id);
            navigation.navigate("Products", {
              categoryId: item._id,
              categoryName: item.category_name || item.name,
              filteredProducts: products
            });
          } catch (err) {
            navigation.navigate("Products", {
              categoryId: item._id,
              categoryName: item.category_name || item.name,
              filteredProducts: []
            });
          }
        }}
      />
    );
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  // Define different snap points based on screen height
  const snapPoints = useMemo(() => {
    if (height < 700) {
      return ["33%", "79%"];
    } else if (height < 800) {
      return ["45%", "83%"];
    } else if (height < 810) {
      return ["45%", "83%"];
    } else {
      return ["50%", "85%"];
    }
  }, [height]);


  const [detailLoading, startLoading, stopLoading] = useLoader(false);

  const handleScan = async (code) => {
    startLoading();
    try {
      const productDetails = await fetchProductDetailsByBarcode(code);
      if (productDetails.length > 0) {
        const details = productDetails[0];
        navigation.navigate('ProductDetail', { detail: details })
      } else {
        showToastMessage("No Products found for this Barcode");
      }
    } catch (error) {
      showToastMessage(`Error fetching inventory details ${error.message}`);
    } finally {
      stopLoading();
    }
  };


  return (
    <SafeAreaView backgroundColor={COLORS.primaryThemeColor}>
      {/* rounded border */}
      <RoundedContainer>
        {/* Header */}
        <Header />
        {/* Navigation Header removed per request */}
        {/* Carousel */}
        <CarouselPagination />

        {/* Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal: 8 }}>
          <ImageContainer
            source={require('@assets/images/logo/logo.png')}
            backgroundColor="#0ea5a4"
            title="Take Orders"
            onPress={() => navigateToScreen("POSRegister")}
          />
        </View>

        {/* Bottom sheet */}
        <BottomSheet snapPoints={snapPoints}>
          {/* Product list header */}
          <ListHeader title="Our Specials" subtitle="Chef's picks for today" />
          {/* flatlist */}
          <BottomSheetFlatList
            data={formatData(filteredCategories, 3)}
            numColumns={3}
            initialNumToRender={5}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: "25%" }}
            onEndReached={handleLoadMore}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loading && <ActivityIndicator size="large" color="#0000ff" />
            }
          />
        </BottomSheet>
        <OverlayLoader visible={detailLoading} />
      </RoundedContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  itemInvisible: {
    backgroundColor: "transparent",
  },
  itemStyle: {
    flex: 1,
    alignItems: "center",
    margin: 6,
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "white",
  },
});

export default HomeScreen;
