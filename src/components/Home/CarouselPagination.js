import { View, StyleSheet, Dimensions, Image, FlatList } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CarouselPagination = () => {
    const [activeSlide, setActiveSlide] = useState(0);
    const flatListRef = useRef(null);
    const data = [
        { image: require('@assets/images/Home/Banner/banner_phone_1.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_2.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_3.png') }
    ];
    const carouselMargin = 8;
    const itemWidth = screenWidth - 2 * carouselMargin;

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSlide((prev) => {
                const next = (prev + 1) % data.length;
                flatListRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveSlide(viewableItems[0].index);
        }
    }).current;

    return (
        <View>
            <FlatList
                ref={flatListRef}
                data={data}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.item, { width: itemWidth }]}>
                        <Image source={item.image} style={styles.image} />
                    </View>
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                style={styles.carouselContainer}
            />
            <View style={styles.paginationContainer}>
                <View style={styles.paginationDotsContainer}>
                    {data.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                { opacity: index === activeSlide ? 1 : 0.4, transform: [{ scale: index === activeSlide ? 1 : 0.6 }] }
                            ]}
                        />
                    ))}
                </View>
            </View>
        </View>
    )
}

export default CarouselPagination

const styles = StyleSheet.create({
    item: {
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: screenHeight * 0.20,
        borderRadius: 5,
        borderWidth: 1,
    },
    carouselContainer: {
        marginHorizontal: 8,
        marginVertical: 20
    },
    paginationContainer: {
        position: 'absolute',
        top: screenHeight * 0.16,
        width: '100%',
        alignItems: 'center',
    },
    paginationDotsContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
        flexDirection: 'row',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 6,
        backgroundColor: '#5D5FEE',
    },
});
