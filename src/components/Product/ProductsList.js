import React, { memo } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import Text from '@components/Text';
import { FONT_FAMILY, COLORS } from '@constants/theme';
import { useCurrencyStore } from '@stores/currency';

const ProductsList = ({ item, onPress, showQuickAdd, onQuickAdd }) => {
    const errorImage = require('@assets/images/error/error.png');

    const truncatedName =
        item?.product_name?.length > 35 ? item?.product_name?.substring(0, 60) + '...' : item?.product_name;

    const currency = useCurrencyStore((state) => state.currency);
    const priceValue = (item?.price ?? item?.list_price ?? 0);


    return (
        <TouchableOpacity onPress={onPress} style={styles.container}>
            {showQuickAdd && (
                <Pressable style={styles.plusBtn} onPress={() => onQuickAdd?.(item)}>
                    <Text style={styles.plusText}>+</Text>
                </Pressable>
            )}
            <View style={styles.imageWrapper}>
                <Image
                    source={item?.image_url ? { uri: item.image_url } : errorImage}
                    style={styles.image}
                />
            </View>
                        <View style={styles.textContainer}>
                                <Text style={styles.name}>{truncatedName?.trim()}</Text>
                                <Text style={styles.price}>{priceValue?.toString ? Number(priceValue).toFixed(2) : priceValue} {currency || ''}</Text>
                                <Text style={styles.code}>
                                    {item.product_code ?? item.code ?? item.default_code ?? ''}
                                </Text>
                                <Text style={styles.category}>
                                    {
                                        item?.category?.category_name
                                        || (Array.isArray(item?.categ_id) ? item.categ_id[1] : null)
                                        || item?.category_name
                                        || ''
                                    }
                                </Text>
                        </View>
        </TouchableOpacity>
    );
};

export default memo(ProductsList);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        alignItems: 'center',
        margin: 5,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 6,
        backgroundColor: 'white',
<<<<<<< HEAD
=======
        width: 150,
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        minHeight: 190,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    imageWrapper: {
        width: 90,
        height: 90,
        borderRadius: 10,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
    },
    textContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginTop: 8,
    },
    name: {
        fontSize: 12,
        textAlign: 'center',
        textTransform: 'capitalize',
        color: '#2E294E',
        fontFamily: FONT_FAMILY.urbanistBold,
        lineHeight: 16,
    },
    price: {
        fontSize: 13,
        textAlign: 'center',
        color: '#F47B20',
        marginTop: 4,
        fontFamily: FONT_FAMILY.urbanistBold,
    },
    plusBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.orange,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    plusText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 22,
    },
    category: {
        fontSize: 10,
        textAlign: 'center',
        color: COLORS.primaryThemeColor,
        marginTop: 2,
        fontFamily: FONT_FAMILY.urbanistSemiBold,
    },
    code: {
        fontSize: 10,
        textAlign: 'center',
        color: '#aaa',
        marginTop: 2,
        fontFamily: FONT_FAMILY.urbanistSemiBold,
    },
});
